/**
 * Stocks domestiques & liste de courses : persistance SQLite — GERETOU
 * Module pur (SqlDb) exécutable sous Expo et sous Node.
 */

import {
  roundQty,
  splitPayment,
  validateStock,
} from './stockCore.ts';
import type { StockInput, StockLike } from './stockCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface StockRecord extends StockLike {
  user_id: string;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestockedItemInput {
  stockId: string;
  boughtQty: number;
  unitPrice?: number | null;
}

export interface RestockBasketParams {
  userId: string;
  accountId: string | null;
  totalAmount: number;
  items: RestockedItemInput[];
}

export interface RestockResult {
  updatedStockCount: number;
  transactionIds: string[];
}

export class StockError extends Error {}

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  is_archived: number;
}

export async function listStocks(db: SqlDb, userId: string): Promise<StockRecord[]> {
  return await db.all<StockRecord>(
    `SELECT * FROM stocks WHERE user_id = ? ORDER BY name ASC;`,
    [userId]
  );
}

export async function getStock(db: SqlDb, userId: string, id: string): Promise<StockRecord | null> {
  return await db.get<StockRecord>(
    `SELECT * FROM stocks WHERE id = ? AND user_id = ?;`,
    [id, userId]
  );
}

export async function createStock(
  db: SqlDb,
  userId: string,
  input: StockInput,
  newId: () => string
): Promise<string> {
  const err = validateStock(input);
  if (err) throw new StockError(err);

  const id = `stock_${newId()}`;
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO stocks (
      id, user_id, name, category, current_qty, unit, min_threshold, target_qty, estimated_unit_price, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      userId,
      input.name.trim(),
      input.category,
      roundQty(input.currentQty),
      input.unit,
      roundQty(input.minThreshold),
      input.targetQty !== null ? roundQty(input.targetQty) : null,
      input.unitPrice !== null ? Math.round(input.unitPrice) : null,
      now,
      now,
    ]
  );

  return id;
}

export async function updateStock(
  db: SqlDb,
  userId: string,
  id: string,
  input: StockInput
): Promise<void> {
  const err = validateStock(input);
  if (err) throw new StockError(err);

  const existing = await getStock(db, userId, id);
  if (!existing) throw new StockError('Produit introuvable.');

  const now = new Date().toISOString();

  await db.run(
    `UPDATE stocks SET
      name = ?,
      category = ?,
      current_qty = ?,
      unit = ?,
      min_threshold = ?,
      target_qty = ?,
      estimated_unit_price = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?;`,
    [
      input.name.trim(),
      input.category,
      roundQty(input.currentQty),
      input.unit,
      roundQty(input.minThreshold),
      input.targetQty !== null ? roundQty(input.targetQty) : null,
      input.unitPrice !== null ? Math.round(input.unitPrice) : null,
      now,
      id,
      userId,
    ]
  );
}

export async function adjustQuantity(
  db: SqlDb,
  userId: string,
  id: string,
  delta: number
): Promise<{ newQty: number }> {
  const existing = await getStock(db, userId, id);
  if (!existing) throw new StockError('Produit introuvable.');

  const target = Math.max(0, roundQty(existing.current_qty + delta));
  const now = new Date().toISOString();

  await db.run(
    `UPDATE stocks SET current_qty = ?, updated_at = ? WHERE id = ? AND user_id = ?;`,
    [target, now, id, userId]
  );

  return { newQty: target };
}

export async function deleteStock(db: SqlDb, userId: string, id: string): Promise<void> {
  await db.run(`DELETE FROM stocks WHERE id = ? AND user_id = ?;`, [id, userId]);
}

/**
 * Réapprovisionnement groupé (courses du foyer) :
 * 1. Vérifie le compte et débite le montant total
 * 2. Crée la/les dépense(s) ventilée(s) pour le budget
 * 3. Réincrémente chaque stock et met à jour last_restocked_at
 */
export async function restockBasket(
  db: SqlDb,
  params: RestockBasketParams,
  newId: () => string
): Promise<RestockResult> {
  const { userId, accountId, totalAmount, items } = params;

  if (items.length === 0) {
    throw new StockError('Aucun produit sélectionné pour le réapprovisionnement.');
  }

  const validItems = items.filter((it) => it.boughtQty > 0);
  if (validItems.length === 0) {
    throw new StockError('Indiquez au moins une quantité à ajouter.');
  }

  const roundedAmount = Math.max(0, Math.round(totalAmount));
  const now = new Date().toISOString();
  const txIds: string[] = [];

  // 1. Débit du compte et enregistrement de dépense si un compte et un montant sont indiqués
  if (accountId && roundedAmount > 0) {
    const account = await db.get<AccountRow>(
      'SELECT id, name, balance, is_archived FROM accounts WHERE id = ? AND user_id = ?;',
      [accountId, userId]
    );
    if (!account || account.is_archived) {
      throw new StockError('Portefeuille introuvable ou clôturé.');
    }
    if (account.balance < roundedAmount) {
      throw new StockError(
        `Solde insuffisant sur ${account.name} : il manque ${roundedAmount - account.balance} FCFA.`
      );
    }

    // Récupérer les infos des stocks pour la répartition comptable
    const stockMap = new Map<string, StockRecord>();
    for (const it of validItems) {
      const s = await getStock(db, userId, it.stockId);
      if (s) stockMap.set(s.id, s);
    }

    const linesForSplit = validItems.map((it) => {
      const s = stockMap.get(it.stockId);
      const est = (it.unitPrice ?? s?.estimated_unit_price ?? 0) * it.boughtQty;
      return {
        category: s?.category ?? 'FOOD',
        name: s?.name ?? 'Article',
        estimate: est > 0 ? Math.round(est) : null,
      };
    });

    const splits = splitPayment(linesForSplit, roundedAmount);

    // Débit du compte
    await db.run(
      'UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;',
      [roundedAmount, now, account.id]
    );

    // Insertion des transactions par catégorie
    for (const split of splits) {
      const txId = `tx_restock_${newId()}`;
      txIds.push(txId);
      const note = `Courses : ${split.names.slice(0, 4).join(', ')}${
        split.names.length > 4 ? '…' : ''
      }`;

      await db.run(
        `INSERT INTO transactions (
          id, user_id, amount, account_id, destination_account_id,
          category_id, type, nature, urgency, provenance,
          date, notes, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'EXPENSE', 'REGULAR', 'NORMAL', NULL, ?, ?, 0, ?, ?);`,
        [txId, userId, split.amount, account.id, split.categoryId, now, note, now, now]
      );

      // Audit log & Sync queue
      await db.run(
        `INSERT INTO audit_log (transaction_id, action, new_data, reason, modified_at)
         VALUES (?, 'CREATE', ?, 'Réapprovisionnement stocks', ?);`,
        [
          txId,
          JSON.stringify({ id: txId, amount: split.amount, accountId: account.id, categoryId: split.categoryId }),
          now,
        ]
      );

      await db.run(
        `INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp, status)
         VALUES (?, 'transactions', 'INSERT', ?, ?, ?, 'PENDING');`,
        [
          `sync_${txId}`,
          txId,
          JSON.stringify({ id: txId, amount: split.amount, accountId: account.id, categoryId: split.categoryId, date: now }),
          Date.now(),
        ]
      );
    }
  }

  // 2. Réincrémenter les stocks
  for (const it of validItems) {
    const existing = await getStock(db, userId, it.stockId);
    if (!existing) continue;

    const nextQty = roundQty(existing.current_qty + it.boughtQty);
    const updatedPrice =
      it.unitPrice !== undefined && it.unitPrice !== null && it.unitPrice > 0
        ? Math.round(it.unitPrice)
        : existing.estimated_unit_price;

    await db.run(
      `UPDATE stocks SET
        current_qty = ?,
        estimated_unit_price = ?,
        last_restocked_at = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?;`,
      [nextQty, updatedPrice, now, now, it.stockId, userId]
    );
  }

  return {
    updatedStockCount: validItems.length,
    transactionIds: txIds,
  };
}
