/**
 * Bandeau de confirmation (toast) — GERETOU
 * Remplace Alert.alert pour les confirmations : fonctionne sur le web et sur mobile,
 * et ne bloque pas la navigation.
 */

import { create } from 'zustand';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toast: Toast | null;
  show: (toast: Omit<Toast, 'id'>, durationMs?: number) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (toast, durationMs = 3500) => {
    if (timer) clearTimeout(timer);
    const id = ++seq;
    set({ toast: { ...toast, id } });
    timer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), durationMs);
  },
  hide: () => {
    if (timer) clearTimeout(timer);
    set({ toast: null });
  },
}));

/** Raccourci utilisable hors composant. */
export const showToast = (toast: Omit<Toast, 'id'>, durationMs?: number) => useToastStore.getState().show(toast, durationMs);
