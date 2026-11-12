/**
 * Zustand Store des Stocks & Liste de Courses — GERETOU
 * Relie stockRepo à expo-sqlite avec transactions ACID et mise à jour des soldes.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, withTransaction } from '../services/db/database';
import {
  StockRecord,
  RestockBasketParams,
  listStocks,
  createStock,
  updateStock,
  adjustQuantity,
  deleteStock,
  restockBasket,
} from '../services/stocks/stockRepo';
import type { StockInput } from '../services/stocks/stockCore';
import { useWalletStore } from './useWalletStore';
import { useAlertStore } from './useAlertStore';

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

interface StockState {
  stocks: StockRecord[];
  isLoading: boolean;

  fetchStocks: (userId: string) => Promise<void>;
  addStock: (userId: string, input: StockInput) => Promise<string | null>;
  editStock: (userId: string, id: string, input: StockInput) => Promise<string | null>;
  stepQuantity: (userId: string, id: string, delta: number) => Promise<string | null>;
  removeStock: (userId: string, id: string) => Promise<string | null>;
  restock: (params: RestockBasketParams) => Promise<string | null>;
}

export const useStockStore = create<StockState>((set, get) => {
  const write = async <T,>(
    userId: string,
    fn: (db: ReturnType<typeof adapt>) => Promise<T>
  ): Promise<T> => {
    const result = await withTransaction((db) => fn(adapt(db)));
    await get().fetchStocks(userId);
    return result;
  };

  return {
    stocks: [],
    isLoading: false,

    fetchStocks: async (userId) => {
      set({ isLoading: true });
      try {
        const db = adapt(await getDatabase());
        const data = await listStocks(db, userId);
        set({ stocks: data, isLoading: false });
      } catch (e) {
        console.error('[GERETOU] Erreur chargement stocks:', e);
        set({ isLoading: false });
      }
    },

    addStock: async (userId, input) => {
      try {
        await write(userId, (db) => createStock(db, userId, input, newId));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    editStock: async (userId, id, input) => {
      try {
        await write(userId, (db) => updateStock(db, userId, id, input));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    stepQuantity: async (userId, id, delta) => {
      try {
        await write(userId, (db) => adjustQuantity(db, userId, id, delta));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    removeStock: async (userId, id) => {
      try {
        await write(userId, (db) => deleteStock(db, userId, id));
        return null;
      } catch (e) {
        return message(e);
      }
    },

    restock: async (params) => {
      try {
        const result = await withTransaction(async (rawDb) => {
          const db = adapt(rawDb);
          return await restockBasket(db, params, newId);
        });

        // Recharger les stocks et les soldes de comptes
        await get().fetchStocks(params.userId);
        if (params.accountId && params.totalAmount > 0) {
          await useWalletStore.getState().fetchWallet(params.userId);
          // Évaluation des alertes de budget (cat_alim, etc.)
          await useAlertStore.getState().afterExpense(params.userId, params.totalAmount, null);
        }
        return null;
      } catch (e) {
        return message(e);
      }
    },
  };
});
