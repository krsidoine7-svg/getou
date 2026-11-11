/**
 * Virement interne neutre — GERETOU
 * Module pur : fonctionne avec n'importe quel pilote SQLite via l'interface SqlDb
 * (expo-sqlite dans l'app, node:sqlite dans les tests). L'appelant l'exécute dans une transaction.
 *
 * Règles :
 * - Le compte source est débité du montant + frais, le compte destination crédité du montant.
 * - Le virement est une transaction de type TRANSFER : il n'entre ni dans les dépenses ni dans les revenus.
 * - Les frais éventuels sont une vraie dépense, catégorie « Frais & commissions ».
 * - Impossible de virer plus que le solde du compte source (un portefeuille mobile ne peut pas être négatif).
 */

export const FEES_CATEGORY = {
  id: 'cat_frais',
  name: 'Frais & commissions',
  icon: 'tag',
  color: '#64748B',
  type: 'EXPENSE',
} as const;

export interface SqlDb {
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface TransferParams {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fees?: number;
  notes?: string;
  date?: string;
}

export class TransferError extends Error {}

interface AccountRow {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  is_archived: number;
}

/** Vérifications sans accès à la base (montants). */
export function validateTransferInput(p: Pick<TransferParams, 'fromAccountId' | 'toAccountId' | 'amount' | 'fees'>): string | null {
  if (!p.fromAccountId || !p.toAccountId) return 'Choisissez le compte à débiter et le compte à créditer.';
  if (p.fromAccountId === p.toAccountId) return 'Les deux comptes doivent être différents.';
  if (!Number.isFinite(p.amount) || p.amount <= 0) return 'Saisissez un montant supérieur à 0 FCFA.';
  if (p.fees !== undefined && (!Number.isFinite(p.fees) || p.fees < 0)) return 'Les frais ne peuvent pas être négatifs.';
  return null;
}

export async function executeTransfer(
  db: SqlDb,
  p: TransferParams,
  newId: () => string
): Promise<{ transferId: string; feesId: string | null }> {
  const inputError = validateTransferInput(p);
  if (inputError) throw new TransferError(inputError);
  const fees = Math.round(p.fees ?? 0);
  const amount = Math.round(p.amount);

  const from = await db.get<AccountRow>('SELECT * FROM accounts WHERE id = ? AND user_id = ?;', [p.fromAccountId, p.userId]);
  const to = await db.get<AccountRow>('SELECT * FROM accounts WHERE id = ? AND user_id = ?;', [p.toAccountId, p.userId]);
  if (!from || !to || from.is_archived || to.is_archived) throw new TransferError('Compte introuvable ou clôturé.');
  if (amount + fees > from.balance) {
    throw new TransferError(
      `Solde insuffisant sur ${from.name} : ${from.balance} FCFA disponibles pour ${amount + fees} FCFA demandés.`
    );
  }

  const now = new Date().toISOString();
  const date = p.date ?? now;

  await db.run('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [amount + fees, now, from.id]);
  await db.run('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [amount, now, to.id]);

  const transferId = `tx_tr_${newId()}`;
  await db.run(
    `INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, category_id, type, nature, urgency, provenance, date, notes, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, 'TRANSFER', 'REGULAR', 'NORMAL', NULL, ?, ?, 0, ?, ?);`,
    [transferId, p.userId, amount, from.id, to.id, date, p.notes?.trim() || `${from.name} → ${to.name}`, now, now]
  );

  let feesId: string | null = null;
  if (fees > 0) {
    await db.run(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, 1);`,
      [FEES_CATEGORY.id, FEES_CATEGORY.name, FEES_CATEGORY.icon, FEES_CATEGORY.color, FEES_CATEGORY.type]
    );
    feesId = `tx_fee_${newId()}`;
    await db.run(
      `INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, category_id, type, nature, urgency, provenance, date, notes, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, 'EXPENSE', 'REGULAR', 'NORMAL', NULL, ?, ?, 0, ?, ?);`,
      [feesId, p.userId, fees, from.id, FEES_CATEGORY.id, date, `Frais de virement vers ${to.name}`, now, now]
    );
  }

  await db.run(
    `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
     VALUES (?, 'transactions', 'INSERT', ?, ?, ?, 'PENDING');`,
    [`sync_${transferId}`, transferId, JSON.stringify({ id: transferId, type: 'TRANSFER', amount, fees, from: from.id, to: to.id }), Date.now()]
  );

  return { transferId, feesId };
}
