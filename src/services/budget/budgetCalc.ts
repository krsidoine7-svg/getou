/**
 * Moteur de calcul budgétaire — GERETOU
 * Module pur (testable sous Node). Les périodes sont calculées en heure locale du téléphone.
 */

import type { BudgetPeriod } from '../../types/database';

export type BudgetStatus = 'healthy' | 'warning' | 'imminent' | 'over';

/** Au-delà de ce ratio (et sous 100 %), le plafond est « imminent ». */
export const IMMINENT_RATIO = 0.95;

/** Début (inclus) et fin (exclue) de la période contenant `now`, en heure locale. */
export function periodRange(period: BudgetPeriod, now: Date = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (period === 'DAY') return { start: new Date(y, m, d), end: new Date(y, m, d + 1) };
  if (period === 'YEAR') return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
}

/** Jours restants dans la période, aujourd'hui inclus (au moins 1). */
export function daysLeftInPeriod(period: BudgetPeriod, now: Date = new Date()): number {
  const { end } = periodRange(period, now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.round((end.getTime() - today.getTime()) / 86_400_000));
}

export function budgetStatus(spent: number, limit: number, alertThreshold: number): BudgetStatus {
  if (limit <= 0) return spent > 0 ? 'over' : 'healthy';
  const ratio = spent / limit;
  if (ratio >= 1) return 'over';
  if (ratio >= IMMINENT_RATIO) return 'imminent';
  if (ratio >= alertThreshold) return 'warning';
  return 'healthy';
}

export interface BudgetProgress {
  spent: number;
  limit: number;
  /** Reste à dépenser (négatif = dépassement). */
  remaining: number;
  /** Ratio consommé (0 → 1+). */
  ratio: number;
  /** Pourcentage entier affiché. */
  percent: number;
  status: BudgetStatus;
  daysLeft: number;
  /** Montant conseillé par jour jusqu'à la fin de la période (0 si dépassé). */
  perDay: number;
}

export function computeProgress(
  input: { period: BudgetPeriod; limit: number; alertThreshold: number; spent: number },
  now: Date = new Date()
): BudgetProgress {
  const { period, limit, alertThreshold, spent } = input;
  const remaining = limit - spent;
  const ratio = limit > 0 ? spent / limit : spent > 0 ? 1 : 0;
  const daysLeft = daysLeftInPeriod(period, now);
  return {
    spent,
    limit,
    remaining,
    ratio,
    percent: Math.round(ratio * 100),
    status: budgetStatus(spent, limit, alertThreshold),
    daysLeft,
    perDay: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
  };
}

/** Libellé court du statut, comme sur la maquette. */
export function statusLabel(p: Pick<BudgetProgress, 'status' | 'percent' | 'remaining'>, alertThreshold: number): string {
  switch (p.status) {
    case 'over':
      return `Dépassé (+${Math.abs(p.remaining).toLocaleString('fr-FR').replace(/ | /g, ' ')} F)`;
    case 'imminent':
      return `Plafond imminent (${p.percent} %)`;
    case 'warning':
      return `Seuil critique (${p.percent} %)`;
    default:
      return p.percent <= Math.round(alertThreshold * 50) ? `Sain (${p.percent} %)` : 'Sous contrôle';
  }
}

/** Ordre d'urgence pour choisir le budget à mettre en avant dans le bandeau d'alerte. */
export function severity(status: BudgetStatus): number {
  return { over: 3, imminent: 2, warning: 1, healthy: 0 }[status];
}
