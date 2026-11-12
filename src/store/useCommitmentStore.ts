/**
 * Dettes & créances + projets d'épargne — GERETOU
 * Relie debtRepo / projectRepo (testés) à expo-sqlite ; chaque écriture est faite en transaction.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, withTransaction } from '../services/db/database';
import { DebtRecord, NewDebt, createDebt, deleteDebt, listDebts, recordRepayment } from '../services/debts/debtRepo';
import { NewProject, ProjectRecord, abandonProject, createProject, fundProject, listProjects, withdrawFromProject } from '../services/projects/projectRepo';
import { useWalletStore } from './useWalletStore';

const newId = () => Crypto.randomUUID();

function adapt(db: SQLiteDatabase) {
  return {
    all: <T,>(sql: string, p: unknown[] = []) => db.getAllAsync<T>(sql, p as never[]),
    get: <T,>(sql: string, p: unknown[] = []) => db.getFirstAsync<T>(sql, p as never[]),
    run: async (sql: string, p: unknown[] = []) => {
      await db.runAsync(sql, p as never[]);
    },
  };
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface CommitmentState {
  debts: DebtRecord[];
  projects: ProjectRecord[];
  isLoading: boolean;
  refresh: (userId: string) => Promise<void>;
  /** Les actions renvoient null si succès, sinon le message d'erreur. */
  addDebt: (d: NewDebt) => Promise<string | null>;
  repay: (userId: string, debtId: string, amount: number, accountId: string | null) => Promise<string | null>;
  removeDebt: (userId: string, debtId: string) => Promise<string | null>;
  addProject: (p: NewProject) => Promise<string | null>;
  fund: (userId: string, projectId: string, fromAccountId: string, amount: number) => Promise<{ error: string | null; completed?: boolean }>;
  withdraw: (userId: string, projectId: string, toAccountId: string, amount: number) => Promise<string | null>;
  abandon: (userId: string, projectId: string) => Promise<string | null>;
}

export const useCommitmentStore = create<CommitmentState>((set, get) => {
  /** Exécute une écriture en transaction, puis recharge engagements et soldes. */
  const write = async <T,>(userId: string, fn: (db: ReturnType<typeof adapt>) => Promise<T>): Promise<T> => {
    const result = await withTransaction((db) => fn(adapt(db)));
    await get().refresh(userId);
    await useWalletStore.getState().fetchWallet(userId);
    return result;
  };

  return {
    debts: [],
    projects: [],
    isLoading: false,

    refresh: async (userId) => {
      set({ isLoading: true });
      try {
        const db = adapt(await getDatabase());
        set({ debts: await listDebts(db, userId), projects: await listProjects(db, userId), isLoading: false });
      } catch (e) {
        console.error('[GERETOU] Lecture des engagements impossible', e);
        set({ isLoading: false });
      }
    },

    addDebt: async (d) => {
      try {
        await write(d.userId, (db) => createDebt(db, d, newId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    repay: async (userId, debtId, amount, accountId) => {
      try {
        await write(userId, (db) => recordRepayment(db, { userId, debtId, amount, accountId }, newId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    removeDebt: async (userId, debtId) => {
      try {
        await write(userId, (db) => deleteDebt(db, userId, debtId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    addProject: async (p) => {
      try {
        await write(p.userId, (db) => createProject(db, p, newId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    fund: async (userId, projectId, fromAccountId, amount) => {
      try {
        const r = await write(userId, (db) => fundProject(db, { userId, projectId, fromAccountId, amount }, newId));
        return { error: null, completed: r.completed };
      } catch (e) {
        return { error: message(e) };
      }
    },

    withdraw: async (userId, projectId, toAccountId, amount) => {
      try {
        await write(userId, (db) => withdrawFromProject(db, { userId, projectId, toAccountId, amount }, newId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    abandon: async (userId, projectId) => {
      try {
        await write(userId, (db) => abandonProject(db, userId, projectId));
        return null;
      } catch (e) {
        return message(e);
      }
    },
  };
});
