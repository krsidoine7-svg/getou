/**
 * Service de Gestion des Portefeuilles & Comptes — GERETOU
 * Intègre la règle stricte de blocage avant suppression et le soft delete.
 */

import { getDatabase, withTransaction } from '../db/database';
import { Account, AccountType, AccountSubType } from '../../types/database';

export interface WalletSummary {
  totalBalance: number;
  liquidBalance: number;
  lockedBalance: number;
  accounts: Account[];
}

export class AccountService {
  /**
   * Récupère tous les comptes actifs (non archivés) de l'utilisateur
   */
  public static async getActiveAccounts(userId: string): Promise<Account[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Account>(
      'SELECT * FROM accounts WHERE user_id = ? AND is_archived = 0 ORDER BY created_at ASC;',
      [userId]
    );
  }

  /**
   * Calcule le résumé consolidé de la trésorerie
   */
  public static async getWalletSummary(userId: string): Promise<WalletSummary> {
    const accounts = await this.getActiveAccounts(userId);

    let totalBalance = 0;
    let liquidBalance = 0;
    let lockedBalance = 0;

    for (const acc of accounts) {
      totalBalance += acc.balance;
      if (acc.sub_type === 'VAULT' || acc.sub_type === 'SAVINGS' || acc.type === 'VAULT') {
        lockedBalance += acc.balance;
      } else {
        liquidBalance += acc.balance;
      }
    }

    return {
      totalBalance,
      liquidBalance,
      lockedBalance,
      accounts,
    };
  }

  /**
   * RÈGLE STRICTE GERETOU :
   * Vérifie si un compte peut être supprimé.
   * Si solde > 0 => BLOCAGE STRICT OBLIGATOIRE avec demande de virement préalable.
   * Si solde == 0 => Autorisé avec Soft Delete (is_archived = 1).
   */
  public static async canDeleteAccount(accountId: string): Promise<{
    canDelete: boolean;
    balance: number;
    reason?: string;
  }> {
    const db = await getDatabase();
    const account = await db.getFirstAsync<Account>(
      'SELECT * FROM accounts WHERE id = ?;',
      [accountId]
    );

    if (!account) {
      return { canDelete: false, balance: 0, reason: 'Compte introuvable.' };
    }

    if (account.balance > 0) {
      return {
        canDelete: false,
        balance: account.balance,
        reason: `Blocage obligatoire : ce compte contient encore un solde positif de ${account.balance} FCFA. Vous devez impérativement transférer la totalité des fonds vers un autre compte avant de pouvoir le supprimer.`,
      };
    }

    if (account.balance < 0) {
      return {
        canDelete: false,
        balance: account.balance,
        reason: `Blocage obligatoire : ce compte est à découvert (${account.balance} FCFA). Vous devez équilibrer le solde à 0 FCFA avant de pouvoir le supprimer.`,
      };
    }

    return { canDelete: true, balance: 0 };
  }

  /**
   * Effectue un virement interne préalable pour vider le compte vers un autre compte
   */
  public static async transferAllFundsBeforeDeletion(
    fromAccountId: string,
    toAccountId: string
  ): Promise<void> {
    const db = await getDatabase();

    await withTransaction(async (txDb) => {
      const source = await txDb.getFirstAsync<Account>(
        'SELECT * FROM accounts WHERE id = ?;',
        [fromAccountId]
      );
      const dest = await txDb.getFirstAsync<Account>(
        'SELECT * FROM accounts WHERE id = ?;',
        [toAccountId]
      );

      if (!source || !dest) {
        throw new Error('Comptes source ou destinataire introuvables.');
      }

      const amountToTransfer = source.balance;
      if (amountToTransfer <= 0) {
        return; // Rien à transférer
      }

      // 1. Débit source
      await txDb.runAsync('UPDATE accounts SET balance = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
        fromAccountId,
      ]);

      // 2. Crédit destination
      await txDb.runAsync(
        'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [amountToTransfer, toAccountId]
      );

      // 3. Enregistrement transaction interne neutre
      const txId = `tx_transfer_${Date.now()}`;
      await txDb.runAsync(
        `INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, type, nature, urgency, date, notes)
         VALUES (?, ?, ?, ?, ?, 'TRANSFER', 'REGULAR', 'NORMAL', CURRENT_TIMESTAMP, ?);`,
        [
          txId,
          source.user_id,
          amountToTransfer,
          fromAccountId,
          toAccountId,
          `Virement de clôture de compte : vidage de solde vers ${dest.name}`,
        ]
      );

      // 4. File d'attente de synchronisation
      await txDb.runAsync(
        `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
         VALUES (?, 'transactions', 'INSERT', ?, ?, ?, 'PENDING');`,
        [
          `sync_${txId}`,
          txId,
          JSON.stringify({
            id: txId,
            type: 'TRANSFER',
            amount: amountToTransfer,
            from: fromAccountId,
            to: toAccountId,
          }),
          Date.now(),
        ]
      );
    });
  }

  /**
   * Soft Delete d'un compte (is_archived = 1)
   * Préserve l'intégrité de l'historique comptable sans supprimer les transactions passées
   */
  public static async softDeleteAccount(accountId: string): Promise<void> {
    const check = await this.canDeleteAccount(accountId);
    if (!check.canDelete) {
      throw new Error(check.reason);
    }

    const db = await getDatabase();
    await withTransaction(async (txDb) => {
      await txDb.runAsync(
        'UPDATE accounts SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
        [accountId]
      );

      // Ajout dans sync_queue
      await txDb.runAsync(
        `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
         VALUES (?, 'accounts', 'UPDATE', ?, ?, ?, 'PENDING');`,
        [
          `sync_del_acc_${Date.now()}`,
          accountId,
          JSON.stringify({ id: accountId, is_archived: 1 }),
          Date.now(),
        ]
      );
    });
  }

  /**
   * Crée un nouveau compte ou un sous-compte (ex: Coffre Wave, MoMo Épargne)
   */
  public static async createAccount(
    userId: string,
    name: string,
    type: AccountType,
    subType: AccountSubType = 'MAIN',
    initialBalance: number = 0
  ): Promise<Account> {
    const db = await getDatabase();
    const accountId = `acc_${type.toLowerCase()}_${Date.now()}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO accounts (id, user_id, name, type, sub_type, balance, currency, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'FCFA', 0, ?, ?);`,
      [accountId, userId, name, type, subType, initialBalance, now, now]
    );

    const created = await db.getFirstAsync<Account>(
      'SELECT * FROM accounts WHERE id = ?;',
      [accountId]
    );

    if (!created) throw new Error('Échec de la création du compte');
    return created;
  }
}
