/**
 * Budgets : lecture des dépenses réelles et enregistrement des plafonds — GERETOU
 * Module pur : fonctionne avec n'importe quel pilote SQLite via l'interface SqlDb.
 *
 * Seules les DÉPENSES non supprimées comptent : les virements internes et les revenus sont exclus.
 */

import type { BudgetPeriod } from '../../types/database';
import { computeProgress, periodRange } from './budgetCalc.ts';
import type { BudgetProgress } from './budgetCalc.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  period: BudgetPeriod;
  category_id: string | null;
  limit_amount: number;
  alert_threshold: number;
  is_active: number;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

export interface BudgetView extends BudgetRow {
  progress: BudgetProgress;
}

export interface BudgetInput {
  userId: string;
  period: BudgetPeriod;
  categoryId: string | null;
  limitAmount: number;
  alertThreshold: number;
}

export class BudgetError extends Error {}

/** Total des dépenses de l'utilisateur sur la période (toutes catégories si categoryId null). */
export async function spentInPeriod(
  db: SqlDb,
  userId: string,
  period: BudgetPeriod,
  categoryId: string | null,
  now: Date = new Date()
): Promise<number> {
  const { start, end } = periodRange(period, now);
  const params: unknown[] = [userId, start.toISOString(), end.toISOString()];
  let sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
             WHERE user_id = ? AND type = 'EXPENSE' AND is_deleted = 0 AND date >= ? AND date < ?`;
  if (categoryId) {
    sql += ' AND category_id = ?';
    params.push(categoryId);
  }
  const row = await db.get<{ total: number }>(`${sql};`, params);
  return row?.total ?? 0;
}

export async function listBudgets(db: SqlDb, userId: string, now: Date = new Date()): Promise<BudgetView[]> {
  const rows = await db.all<BudgetRow>(
    `SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
     FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? AND b.is_active = 1
     ORDER BY b.category_id IS NOT NULL, b.period, c.name;`,
    [userId]
  );
  const views: BudgetView[] = [];
  for (const row of rows) {
    const spent = await spentInPeriod(db, userId, row.period, row.category_id, now);
    views.push({
      ...row,
      progress: computeProgress({ period: row.period, limit: row.limit_amount, alertThreshold: row.alert_threshold, spent }, now),
    });
  }
  return views;
}

export function validateBudgetInput(input: Pick<BudgetInput, 'limitAmount' | 'alertThreshold'>): string | null {
  if (!Number.isFinite(input.limitAmount) || input.limitAmount <= 0) return 'Saisissez un plafond supérieur à 0 FCFA.';
  if (!(input.alertThreshold > 0 && input.alertThreshold < 1)) return "Le seuil d'alerte doit être compris entre 1 et 99 %.";
  return null;
}

/**
 * Crée le plafond, ou met à jour celui qui existe déjà pour la même période et la même catégorie
 * (un seul plafond actif par couple période / catégorie).
 */
export async function saveBudget(db: SqlDb, input: BudgetInput, newId: () => string, editingId?: string): Promise<string> {
  const invalid = validateBudgetInput(input);
  if (invalid) throw new BudgetError(invalid);

  const existing = await db.get<{ id: string }>(
    `SELECT id FROM budgets WHERE user_id = ? AND period = ? AND is_active = 1
       AND ((category_id IS NULL AND ? IS NULL) OR category_id = ?) ${editingId ? 'AND id != ?' : ''};`,
    editingId ? [input.userId, input.period, input.categoryId, input.categoryId, editingId] : [input.userId, input.period, input.categoryId, input.categoryId]
  );
  if (existing && editingId) {
    throw new BudgetError('Un plafond existe déjà pour cette catégorie et cette période.');
  }

  const targetId = editingId ?? existing?.id;
  if (targetId) {
    await db.run(
      'UPDATE budgets SET period = ?, category_id = ?, limit_amount = ?, alert_threshold = ? WHERE id = ? AND user_id = ?;',
      [input.period, input.categoryId, Math.round(input.limitAmount), input.alertThreshold, targetId, input.userId]
    );
    return targetId;
  }
  const id = `bud_${newId()}`;
  await db.run(
    `INSERT INTO budgets (id, user_id, period, category_id, limit_amount, alert_threshold, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1);`,
    [id, input.userId, input.period, input.categoryId, Math.round(input.limitAmount), input.alertThreshold]
  );
  return id;
}

/** Supprime un plafond (désactivation : l'historique des dépenses n'est pas touché). */
export async function removeBudget(db: SqlDb, userId: string, budgetId: string): Promise<void> {
  await db.run('UPDATE budgets SET is_active = 0 WHERE id = ? AND user_id = ?;', [budgetId, userId]);
}
