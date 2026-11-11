/**
 * Zustand Store des Transactions & Catégories — GERETOU
 */

import { create } from 'zustand';
import {
  TransactionService,
  CreateExpenseParams,
  CreateIncomeParams,
} from '../services/transaction/transactionService';
import { Transaction, Category } from '../types/database';

interface TransactionState {
  categories: Category[];
  recentTransactions: Transaction[];
  selectedCategoryId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCategories: (type?: 'EXPENSE' | 'INCOME') => Promise<void>;
  fetchRecentTransactions: (userId: string) => Promise<void>;
  selectCategory: (categoryId: string) => void;
  createExpense: (params: CreateExpenseParams) => Promise<Transaction | null>;
  createIncome: (params: CreateIncomeParams) => Promise<{ transaction: Transaction; isDebtCreated: boolean } | null>;
  addCustomCategory: (
    name: string,
    icon: string,
    color: string,
    type: 'EXPENSE' | 'INCOME' | 'BOTH'
  ) => Promise<Category | null>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  categories: [],
  recentTransactions: [],
  selectedCategoryId: null,
  isLoading: false,
  error: null,

  fetchCategories: async (type) => {
    try {
      const cats = await TransactionService.getCategories(type);
      set({
        categories: cats,
        selectedCategoryId: get().selectedCategoryId || cats[0]?.id || null,
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchRecentTransactions: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      const txs = await TransactionService.getRecentTransactions(userId);
      set({ recentTransactions: txs, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
    }
  },

  selectCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
  },

  createExpense: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const tx = await TransactionService.recordExpense(params);
      await get().fetchRecentTransactions(params.userId);
      set({ isLoading: false });
      return tx;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return null;
    }
  },

  createIncome: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const result = await TransactionService.recordIncome(params);
      await get().fetchRecentTransactions(params.userId);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return null;
    }
  },

  addCustomCategory: async (name, icon, color, type) => {
    try {
      set({ isLoading: true });
      const newCat = await TransactionService.createCustomCategory(name, icon, color, type);
      await get().fetchCategories(type === 'BOTH' ? undefined : type);
      set({ selectedCategoryId: newCat.id, isLoading: false });
      return newCat;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return null;
    }
  },
}));
