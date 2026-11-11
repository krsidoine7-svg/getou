/**
 * Dettes & créances — lecture des soldes ouverts (tableau de bord) — GERETOU
 */

import { getDatabase } from '../db/database';
import { DebtRow, summarizeDebts } from '../dashboard/dashboardData';

export async function getOpenDebtBalances(userId: string): Promise<{ owedToMe: number; iOwe: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DebtRow>(
    'SELECT type, remaining_amount, status FROM debts_credits WHERE user_id = ?;',
    [userId]
  );
  return summarizeDebts(rows);
}
