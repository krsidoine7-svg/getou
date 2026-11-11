/**
 * Calculs d'affichage du tableau de bord — GERETOU
 * Module pur (testable sous Node).
 */

import type { Account, AccountType } from '../../types/database';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  WAVE: 'Wave',
  MOMO: 'MTN MoMo',
  ORANGE: 'Orange Money',
  CASH: 'Espèces',
  BANK: 'Banque',
  VAULT: 'Coffre',
};

export interface AccountCard {
  account: Account;
  /** Total des sous-comptes coffre / épargne du même opérateur. */
  savings: number;
  savingsLabel: string | null;
}

/**
 * Une carte par compte principal ; les coffres / épargnes du même opérateur
 * sont additionnés sous la carte (comme « Coffre 50 000 F » sur la maquette).
 * Un coffre sans compte principal du même type garde sa propre carte.
 */
export function groupAccountsForCards(accounts: Account[]): AccountCard[] {
  const active = accounts.filter((a) => !a.is_archived);
  const mains = active.filter((a) => a.sub_type === 'MAIN');
  const cards: AccountCard[] = mains.map((account) => ({ account, savings: 0, savingsLabel: null }));

  for (const sub of active.filter((a) => a.sub_type !== 'MAIN')) {
    const parent = cards.find((c) => c.account.type === sub.type);
    if (parent) {
      parent.savings += sub.balance;
      parent.savingsLabel = sub.sub_type === 'VAULT' ? 'Coffre' : 'Épargne';
    } else {
      cards.push({ account: sub, savings: 0, savingsLabel: null });
    }
  }
  return cards;
}

/** « À l'instant », « Il y a 5 min », « Il y a 2 h », « Hier, 18:30 », « 24 mai ». */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (d.toDateString() === now.toDateString()) return `Il y a ${Math.floor(diffMin / 60)} h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Hier, ${time}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export interface DebtRow {
  type: 'DEBT' | 'CREDIT';
  remaining_amount: number;
  status: string;
}

/** Créances (on vous doit) et dettes (vous devez) encore ouvertes. */
export function summarizeDebts(rows: DebtRow[]): { owedToMe: number; iOwe: number } {
  let owedToMe = 0;
  let iOwe = 0;
  for (const r of rows) {
    if (r.status === 'SETTLED') continue;
    if (r.type === 'CREDIT') owedToMe += r.remaining_amount;
    else iOwe += r.remaining_amount;
  }
  return { owedToMe, iOwe };
}

export interface AccountGroup {
  account: Account;
  /** Coffres / épargnes du même opérateur, rattachés à ce compte principal. */
  children: Account[];
}

/** Comptes principaux avec leurs coffres / épargnes ; un sous-compte orphelin forme son propre groupe. */
export function groupAccountsWithChildren(accounts: Account[]): AccountGroup[] {
  const active = accounts.filter((a) => !a.is_archived);
  const groups: AccountGroup[] = active.filter((a) => a.sub_type === 'MAIN').map((account) => ({ account, children: [] }));
  for (const sub of active.filter((a) => a.sub_type !== 'MAIN')) {
    const parent = groups.find((g) => g.account.sub_type === 'MAIN' && g.account.type === sub.type);
    if (parent) parent.children.push(sub);
    else groups.push({ account: sub, children: [] });
  }
  return groups;
}
