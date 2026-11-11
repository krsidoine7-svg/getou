/**
 * Store de navigation — GERETOU
 * Écran courant + pile de retour, sans dépendance de routeur externe.
 */

import { create } from 'zustand';

/** Racines accessibles depuis la barre d'onglets. */
export const TAB_SCREENS = ['DASHBOARD', 'WALLETS', 'BUDGETS', 'STOCKS', 'MORE'] as const;
export type TabScreen = (typeof TAB_SCREENS)[number];

/** Modules secondaires ouverts depuis l'onglet « Plus ». */
export type ModuleScreen =
  | 'DEBTS'
  | 'PROJECTS'
  | 'AGENDA'
  | 'ANALYTICS'
  | 'NOTIFICATIONS'
  | 'SETTINGS'
  | 'BACKUP'
  | 'DEADLINE_ALERT'
  | 'TRASH';

/** Saisies plein écran (sans barre d'onglets). */
export type FlowScreen = 'NEW_EXPENSE' | 'NEW_INCOME';

export type ScreenName = TabScreen | ModuleScreen | FlowScreen;

export function isTabScreen(screen: ScreenName): screen is TabScreen {
  return (TAB_SCREENS as readonly string[]).includes(screen);
}

interface NavState {
  current: ScreenName;
  history: ScreenName[];
  /** Ouvre un écran en empilant l'écran courant. */
  navigate: (screen: ScreenName) => void;
  /** Remplace l'écran courant sans l'empiler (ex : bascule Dépense ↔ Revenu). */
  replace: (screen: ScreenName) => void;
  /** Bascule d'onglet : l'onglet devient la nouvelle racine (pile vidée). */
  switchTab: (tab: TabScreen) => void;
  /** Revient à l'écran précédent (ou au tableau de bord si la pile est vide). */
  goBack: () => void;
  /** Vide la pile et revient au tableau de bord. */
  reset: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  current: 'DASHBOARD',
  history: [],
  navigate: (screen) =>
    set((s) => (s.current === screen ? s : { current: screen, history: [...s.history, s.current] })),
  replace: (screen) => set({ current: screen }),
  switchTab: (tab) => set({ current: tab, history: [] }),
  goBack: () =>
    set((s) => {
      const history = s.history.slice(0, -1);
      return { current: s.history[s.history.length - 1] ?? 'DASHBOARD', history };
    }),
  reset: () => set({ current: 'DASHBOARD', history: [] }),
}));
