/**
 * Corbeille & Restauration — GERETOU
 * Gestion de la suppression douce (soft delete), restauration avec intégrité des soldes
 * et purge définitive. Module pur (SqlDb) exécutable sous Expo et sous Node.
 */

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface TrashItem {
  id: string;
  user_id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  account_id: string;
  account_name: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  date: string;
  notes: string | null;
  deleted_at: string | null;
}

export class TrashError extends Error {}

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  is_archived: number;
}

interface TxRow {
  id: string;
  user_id: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  account_id: string;
  is_deleted: number;
}

/**
 * Suppression douce d'une transaction :
 * - Restitue les fonds sur le compte (si dépense, recrédite ; si revenu, redébite)
 * - Marque is_deleted = 1 et deleted_at = now
 */
export async function softDeleteTransaction(
  db: SqlDb,
  userId: string,
  txId: string
): Promise<void> {
  const tx = await db.get<TxRow>(
    'SELECT id, user_id, amount, type, account_id, is_deleted FROM transactions WHERE id = ? AND user_id = ?;',
    [txId, userId]
  );
  if (!tx) throw new TrashError('Transaction introuvable.');
  if (tx.is_deleted === 1) return; // Déjà à la corbeille

  const now = new Date().toISOString();

  // Ajustement de solde inverse
  if (tx.type === 'EXPENSE') {
    await db.run('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
      tx.amount,
      now,
      tx.account_id,
    ]);
  } else if (tx.type === 'INCOME') {
    await db.run('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
      tx.amount,
      now,
      tx.account_id,
    ]);
  }

  // Marquer supprimée
  await db.run(
    'UPDATE transactions SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?;',
    [now, now, txId, userId]
  );

  // Audit log
  await db.run(
    `INSERT INTO audit_log (transaction_id, action, new_data, reason, modified_at)
     VALUES (?, 'DELETE', ?, 'Mise à la corbeille', ?);`,
    [txId, JSON.stringify({ is_deleted: 1, deleted_at: now }), now]
  );
}

/**
 * Restauration d'une transaction supprimée :
 * - Vérifie que le compte existe et est actif
 * - Si dépense, vérifie que le solde est suffisant pour redéduire le montant
 * - Marque is_deleted = 0 et deleted_at = null
 */
export async function restoreTransaction(
  db: SqlDb,
  userId: string,
  txId: string
): Promise<void> {
  const tx = await db.get<TxRow>(
    'SELECT id, user_id, amount, type, account_id, is_deleted FROM transactions WHERE id = ? AND user_id = ?;',
    [txId, userId]
  );
  if (!tx) throw new TrashError('Transaction introuvable.');
  if (tx.is_deleted === 0) return; // Déjà active

  const account = await db.get<AccountRow>(
    'SELECT id, name, balance, is_archived FROM accounts WHERE id = ? AND user_id = ?;',
    [tx.account_id, userId]
  );
  if (!account || account.is_archived) {
    throw new TrashError('Le compte associé à cette opération est introuvable ou clôturé.');
  }

  const now = new Date().toISOString();

  if (tx.type === 'EXPENSE') {
    if (account.balance < tx.amount) {
      throw new TrashError(
        `Solde insuffisant sur ${account.name} pour restaurer cette dépense : il manque ${
          tx.amount - account.balance
        } FCFA.`
      );
    }
    await db.run('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [
      tx.amount,
      now,
      tx.account_id,
    ]);
  } else if (tx.type === 'INCOME') {
    await db.run('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [
      tx.amount,
      now,
      tx.account_id,
    ]);
  }

  await db.run(
    'UPDATE transactions SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?;',
    [now, txId, userId]
  );

  // Audit log
  await db.run(
    `INSERT INTO audit_log (transaction_id, action, new_data, reason, modified_at)
     VALUES (?, 'UPDATE', ?, 'Restauration depuis la corbeille', ?);`,
    [txId, JSON.stringify({ is_deleted: 0 }), now]
  );
}

/**
 * Récupère tous les éléments de la corbeille ordonnés par date de suppression décroissante
 */
export async function listTrashItems(db: SqlDb, userId: string): Promise<TrashItem[]> {
  return await db.all<TrashItem>(
    `SELECT
       t.id,
       t.user_id,
       t.amount,
       t.type,
       t.account_id,
       a.name AS account_name,
       t.category_id,
       c.name AS category_name,
       c.icon AS category_icon,
       c.color AS category_color,
       t.date,
       t.notes,
       t.deleted_at
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.is_deleted = 1
     ORDER BY t.deleted_at DESC, t.date DESC;`,
    [userId]
  );
}

/**
 * Suppression définitive irréversible d'un élément
 */
export async function deletePermanently(
  db: SqlDb,
  userId: string,
  txId: string
): Promise<void> {
  await db.run(
    'DELETE FROM transactions WHERE id = ? AND user_id = ? AND is_deleted = 1;',
    [txId, userId]
  );
}

/**
 * Vider intégralement la corbeille
 */
export async function emptyTrash(
  db: SqlDb,
  userId: string
): Promise<{ deletedCount: number }> {
  const items = await db.all<{ id: string }>(
    'SELECT id FROM transactions WHERE user_id = ? AND is_deleted = 1;',
    [userId]
  );
  await db.run(
    'DELETE FROM transactions WHERE user_id = ? AND is_deleted = 1;',
    [userId]
  );
  return { deletedCount: items.length };
}
