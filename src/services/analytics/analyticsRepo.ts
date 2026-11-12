/**
 * Service d'analyses financières — Requêtes SQLite — GERETOU
 * Module pur (SqlDb) compatible Expo et Node.
 */

import {
  computeAnalytics,
  generateFinancialDiagnostic,
  getPeriodRange,
} from './analyticsCore.ts';
import type {
  AnalyticsPeriod,
  AnalyticsSummary,
  DiagnosticResult,
  RawTxRow,
} from './analyticsCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface AnalyticsReport {
  summary: AnalyticsSummary;
  diagnostic: DiagnosticResult;
  monthlyBudgetLimit: number | null;
}

export async function fetchAnalyticsReport(
  db: SqlDb,
  userId: string,
  period: AnalyticsPeriod,
  refDate: Date = new Date()
): Promise<AnalyticsReport> {
  const range = getPeriodRange(period, refDate);

  // 1. Transactions de la période (Revenus et Dépenses uniquement, hors virements neutres)
  const rows = await db.all<RawTxRow>(
    `SELECT
       t.amount,
       t.type,
       t.category_id,
       t.date,
       c.name AS category_name,
       c.icon AS category_icon,
       c.color AS category_color
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ?
       AND t.is_deleted = 0
       AND t.type IN ('EXPENSE', 'INCOME')
       AND date(t.date) >= date(?)
       AND date(t.date) <= date(?)
     ORDER BY t.date ASC;`,
    [userId, range.startDate, range.endDate]
  );

  // 2. Plafond budgétaire mensuel global de l'utilisateur (s'il existe)
  const budgetRow = await db.get<{ limit_amount: number }>(
    `SELECT limit_amount
     FROM budgets
     WHERE user_id = ?
       AND period = 'MONTH'
       AND category_id IS NULL
       AND is_active = 1
     LIMIT 1;`,
    [userId]
  );
  const monthlyBudgetLimit = budgetRow?.limit_amount ?? null;

  // 3. Calculs statistiques
  const summary = computeAnalytics(rows, period, refDate);
  const diagnostic = generateFinancialDiagnostic(summary, monthlyBudgetLimit);

  return {
    summary,
    diagnostic,
    monthlyBudgetLimit,
  };
}
