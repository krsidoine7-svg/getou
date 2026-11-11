/**
 * Store des budgets — GERETOU
 * Relie le moteur de budgets (budgetRepo, testé) à la base expo-sqlite.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../services/db/database';
import { BudgetInput, BudgetView, SqlDb, listBudgets, removeBudget, saveBudget } from '../services/budget/budgetRepo';

async function sqlDb(): Promise<SqlDb> {
  const db = await getDatabase();
  return {
    all: (sql, p = []) => db.getAllAsync(sql, p as never[]),
    get: (sql, p = []) => db.getFirstAsync(sql, p as never[]),
    run: async (sql, p = []) => {
      await db.runAsync(sql, p as never[]);
    },
  };
}

interface BudgetState {
  budgets: BudgetView[];
  isLoading: boolean;
  refresh: (userId: string) => Promise<void>;
  /** Renvoie null si succès, sinon le message d'erreur. */
  save: (input: BudgetInput, editingId?: string) => Promise<string | null>;
  remove: (userId: string, budgetId: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  isLoading: false,

  refresh: async (userId) => {
    set({ isLoading: true });
    try {
      set({ budgets: await listBudgets(await sqlDb(), userId), isLoading: false });
    } catch (e) {
      console.error('[GERETOU] Lecture des budgets impossible', e);
      set({ isLoading: false });
    }
  },

  save: async (input, editingId) => {
    try {
      await saveBudget(await sqlDb(), input, () => Crypto.randomUUID(), editingId);
      await get().refresh(input.userId);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  },

  remove: async (userId, budgetId) => {
    await removeBudget(await sqlDb(), userId, budgetId);
    await get().refresh(userId);
  },
}));
