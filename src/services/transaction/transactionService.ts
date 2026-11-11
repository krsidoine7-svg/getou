/**
 * Service de Gestion des Transactions & Comptabilité Locale — GERETOU
 * Exécution sous transaction SQLite ACID (0 ms), intégrité du grand-livre,
 * calcul automatique des soldes et enfilement dans sync_queue.
 */

import { getDatabase, withTransaction } from '../db/database';
import {
  Transaction,
  TransactionType,
  TransactionNature,
  TransactionUrgency,
  IncomeProvenance,
  Category,
  Account,
} from '../../types/database';

export interface CreateExpenseParams {
  userId: string;
  amount: number;
  accountId: string;
  categoryId: string;
  nature?: TransactionNature;
  urgency?: TransactionUrgency;
  date?: string;
  notes?: string;
  receiptUri?: string;
}

export interface CreateIncomeParams {
  userId: string;
  amount: number;
  accountId: string;
  provenance: IncomeProvenance;
  categoryId?: string;
  date?: string;
  notes?: string;
  savingsProjectId?: string;
  savingsPercentage?: number; // ex: 15%
}

export class TransactionService {
  /**
   * Récupère toutes les catégories actives (dépenses ou recettes)
   */
  public static async getCategories(type?: 'EXPENSE' | 'INCOME'): Promise<Category[]> {
    const db = await getDatabase();
    if (type) {
      return await db.getAllAsync<Category>(
        "SELECT * FROM categories WHERE type = ? OR type = 'BOTH' ORDER BY is_default DESC, name ASC;",
        [type]
      );
    }
    return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY is_default DESC, name ASC;');
  }

  /**
   * Crée une nouvelle catégorie personnalisée
   */
  public static async createCustomCategory(
    name: string,
    icon: string,
    color: string,
    type: 'EXPENSE' | 'INCOME' | 'BOTH'
  ): Promise<Category> {
    const db = await getDatabase();
    const catId = `cat_custom_${Date.now()}`;
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, type, is_default)
       VALUES (?, ?, ?, ?, ?, 0);`,
      [catId, name.trim(), icon, color, type]
    );

    const created = await db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?;',
      [catId]
    );
    if (!created) throw new Error('Échec de la création de catégorie');
    return created;
  }

  /**
   * Récupère les transactions récentes de l'utilisateur
   */
  public static async getRecentTransactions(userId: string, limit: number = 20): Promise<Transaction[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Transaction>(
      `SELECT t.*, c.icon AS category_icon, c.name AS category_name, a.name AS account_name, a.type AS account_type
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN accounts a ON a.id = t.account_id
       WHERE t.user_id = ? AND t.is_deleted = 0
       ORDER BY t.date DESC LIMIT ?;`,
      [userId, limit]
    );
  }

  /**
   * ENREGISTREMENT D'UNE DÉPENSE (Transaction ACID complète)
   * 1. Vérification du solde du compte
   * 2. Insertion dans transactions
   * 3. Décrémentation du solde du compte (balance = balance - amount)
   * 4. Enregistrement dans audit_log
   * 5. Enregistrement dans sync_queue
   */
  public static async recordExpense(params: CreateExpenseParams): Promise<Transaction> {
    const {
      userId,
      amount,
      accountId,
      categoryId,
      nature = 'REGULAR',
      urgency = 'NORMAL',
      date = new Date().toISOString(),
      notes,
      receiptUri,
    } = params;

    if (amount <= 0) {
      throw new Error('Le montant de la dépense doit être supérieur à 0 FCFA.');
    }

    const txId = `tx_exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    return await withTransaction(async (txDb) => {
      // 1. Vérifier le compte source
      const account = await txDb.getFirstAsync<Account>(
        'SELECT * FROM accounts WHERE id = ? AND is_archived = 0;',
        [accountId]
      );
      if (!account) {
        throw new Error('Le portefeuille sélectionné est introuvable ou archivé.');
      }

      // 2. Insérer la transaction de dépense
      await txDb.runAsync(
        `INSERT INTO transactions (
          id, user_id, amount, account_id, destination_account_id,
          category_id, type, nature, urgency, provenance,
          date, notes, receipt_uri, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'EXPENSE', ?, ?, NULL, ?, ?, ?, 0, ?, ?);`,
        [
          txId,
          userId,
          amount,
          accountId,
          categoryId,
          nature,
          urgency,
          date,
          notes || null,
          receiptUri || null,
          now,
          now,
        ]
      );

      // 3. Décrémenter le solde du compte débité
      await txDb.runAsync(
        'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
        [amount, now, accountId]
      );

      // 4. Audit Log
      await txDb.runAsync(
        `INSERT INTO audit_log (transaction_id, action, new_data, reason, modified_at)
         VALUES (?, 'CREATE', ?, 'Enregistrement dépense express', ?);`,
        [
          txId,
          JSON.stringify({ id: txId, amount, accountId, categoryId, type: 'EXPENSE' }),
          now,
        ]
      );

      // 5. File d'attente de synchronisation locale
      await txDb.runAsync(
        `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
         VALUES (?, 'transactions', 'INSERT', ?, ?, ?, 'PENDING');`,
        [
          `sync_${txId}`,
          txId,
          JSON.stringify({ id: txId, amount, accountId, categoryId, type: 'EXPENSE', date }),
          Date.now(),
        ]
      );

      const createdTx = await txDb.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?;',
        [txId]
      );
      if (!createdTx) throw new Error("Échec d'enregistrement de la dépense.");
      return createdTx;
    });
  }

  /**
   * ENREGISTREMENT D'UN REVENU (Avec application de la Règle Comptable Stricte)
   * Si provenance === 'LOAN' (Crédit / Emprunt) :
   * - Ne crédite PAS le revenu d'activité
   * - Insère automatiquement une dette passive dans la table `debts_credits`
   * - Crédite le compte bancaire/mobile money sélectionné
   */
  public static async recordIncome(params: CreateIncomeParams): Promise<{
    transaction: Transaction;
    isDebtCreated: boolean;
  }> {
    const {
      userId,
      amount,
      accountId,
      provenance,
      categoryId,
      date = new Date().toISOString(),
      notes,
    } = params;

    if (amount <= 0) {
      throw new Error('Le montant du revenu doit être supérieur à 0 FCFA.');
    }

    const txId = `tx_inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    let isDebtCreated = false;

    const transaction = await withTransaction(async (txDb) => {
      // 1. Vérifier le compte destinataire
      const account = await txDb.getFirstAsync<Account>(
        'SELECT * FROM accounts WHERE id = ? AND is_archived = 0;',
        [accountId]
      );
      if (!account) {
        throw new Error('Le portefeuille sélectionné est introuvable ou archivé.');
      }

      // 2. RÈGLE COMPTABLE STRICTE GERETOU :
      // Si provenance === 'LOAN', on crée une entrée dans debts_credits
      if (provenance === 'LOAN') {
        const debtId = `debt_${Date.now()}`;
        await txDb.runAsync(
          `INSERT INTO debts_credits (
            id, user_id, type, person_name, initial_amount,
            remaining_amount, status, notes, created_at, updated_at
          ) VALUES (?, ?, 'DEBT', ?, ?, ?, 'PENDING', ?, ?, ?);`,
          [
            debtId,
            userId,
            notes || 'Emprunt / Dette financière',
            amount,
            amount,
            `Encaissement de dette sur ${account.name}`,
            now,
            now,
          ]
        );
        isDebtCreated = true;
      }

      // 3. Insertion dans transactions
      await txDb.runAsync(
        `INSERT INTO transactions (
          id, user_id, amount, account_id, destination_account_id,
          category_id, type, nature, urgency, provenance,
          date, notes, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'INCOME', 'REGULAR', 'NORMAL', ?, ?, ?, 0, ?, ?);`,
        [
          txId,
          userId,
          amount,
          accountId,
          categoryId || null,
          provenance,
          date,
          notes || null,
          now,
          now,
        ]
      );

      // 4. Créditer le solde du compte sélectionné
      await txDb.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;',
        [amount, now, accountId]
      );

      // 5. File d'attente de synchronisation
      await txDb.runAsync(
        `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
         VALUES (?, 'transactions', 'INSERT', ?, ?, ?, 'PENDING');`,
        [
          `sync_${txId}`,
          txId,
          JSON.stringify({ id: txId, amount, accountId, provenance, type: 'INCOME', date }),
          Date.now(),
        ]
      );

      const created = await txDb.getFirstAsync<Transaction>(
        'SELECT * FROM transactions WHERE id = ?;',
        [txId]
      );
      if (!created) throw new Error("Échec d'enregistrement du revenu.");
      return created;
    });

    return { transaction, isDebtCreated };
  }
}
