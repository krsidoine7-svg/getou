/**
 * Zustand Store de Trésorerie & Portefeuilles — GERETOU
 * Gère les comptes, soldes consolidés, virements préalables et soft delete.
 */

import { create } from 'zustand';
import { useAlertStore } from './useAlertStore';
import { AccountService, WalletSummary } from '../services/account/accountService';
import type { TransferParams } from '../services/account/transferCore';
import { Account, AccountType, AccountSubType } from '../types/database';

interface WalletState {
  summary: WalletSummary;
  selectedAccountId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWallet: (userId: string) => Promise<void>;
  selectAccount: (accountId: string) => void;
  createAccount: (
    userId: string,
    name: string,
    type: AccountType,
    subType: AccountSubType,
    initialBalance: number
  ) => Promise<boolean>;
  checkCanDelete: (accountId: string) => Promise<{ canDelete: boolean; balance: number; reason?: string }>;
  transferFundsBeforeDeletion: (fromId: string, toId: string) => Promise<boolean>;
  softDeleteAccount: (accountId: string, userId: string) => Promise<boolean>;
  /** Virement interne ; renvoie null si succès, sinon le message d'erreur à afficher. */
  transfer: (params: TransferParams) => Promise<string | null>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  summary: {
    totalBalance: 0,
    liquidBalance: 0,
    lockedBalance: 0,
    accounts: [],
  },
  selectedAccountId: null,
  isLoading: false,
  error: null,

  fetchWallet: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const summary = await AccountService.getWalletSummary(userId);
      set({
        summary,
        selectedAccountId: get().selectedAccountId || summary.accounts[0]?.id || null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Erreur chargement portefeuilles' });
    }
  },

  selectAccount: (accountId: string) => {
    set({ selectedAccountId: accountId });
  },

  createAccount: async (userId, name, type, subType, initialBalance) => {
    try {
      set({ isLoading: true });
      await AccountService.createAccount(userId, name, type, subType, initialBalance);
      await get().fetchWallet(userId);
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return false;
    }
  },

  checkCanDelete: async (accountId: string) => {
    return await AccountService.canDeleteAccount(accountId);
  },

  transferFundsBeforeDeletion: async (fromId: string, toId: string) => {
    try {
      set({ isLoading: true });
      await AccountService.transferAllFundsBeforeDeletion(fromId, toId);
      const accounts = get().summary.accounts;
      if (accounts.length > 0) {
        await get().fetchWallet(accounts[0].user_id);
      }
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return false;
    }
  },

  transfer: async (params) => {
    try {
      set({ isLoading: true, error: null });
      await AccountService.transfer(params);
      await get().fetchWallet(params.userId);
      if (params.fees && params.fees > 0) await useAlertStore.getState().afterExpense(params.userId, params.fees, 'cat_frais');
      return null;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return err?.message || 'Virement impossible.';
    }
  },

  softDeleteAccount: async (accountId: string, userId: string) => {
    try {
      set({ isLoading: true });
      await AccountService.softDeleteAccount(accountId);
      await get().fetchWallet(userId);
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      return false;
    }
  },
}));
