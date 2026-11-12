/**
 * Projets d'achat & épargne dédiée — règles pures (testables sous Node).
 */

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectStatus = 'IDEA' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: 'Priorité basse',
  MEDIUM: 'Priorité moyenne',
  HIGH: 'Priorité haute',
  CRITICAL: 'Priorité vitale',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  IDEA: 'Planifié',
  ACTIVE: 'En cours',
  COMPLETED: 'Objectif atteint',
  ABANDONED: 'Abandonné',
};

export function progress(locked: number, target: number): number {
  return target > 0 ? Math.min(1, Math.max(0, locked / target)) : 0;
}

/** Jours restants jusqu'à la date cible (« AAAA-MM-JJ »), aujourd'hui exclu ; null sans date. */
export function daysLeft(targetDate: string | null, now: Date = new Date()): number | null {
  if (!targetDate) return null;
  const [y, m, d] = targetDate.split('-').map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

export interface SavingsAdvice {
  remaining: number;
  /** Semaines pleines ou entamées restantes (au moins 1). */
  weeks: number;
  perWeek: number;
  perMonth: number;
}

/**
 * Montant à mettre de côté pour atteindre l'objectif à la date cible.
 * null si l'objectif est atteint, sans date ou si la date est passée.
 * Arrondi à la centaine supérieure pour un montant facile à retenir.
 */
export function savingsAdvice(target: number, locked: number, targetDate: string | null, now: Date = new Date()): SavingsAdvice | null {
  const remaining = target - locked;
  const days = daysLeft(targetDate, now);
  if (remaining <= 0 || days === null || days <= 0) return null;
  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(1, Math.ceil(days / 30));
  const round100 = (n: number) => Math.ceil(n / 100) * 100;
  return { remaining, weeks, perWeek: round100(remaining / weeks), perMonth: round100(remaining / months) };
}

/** Le projet le plus utile à conseiller : en cours, avec date, le plus proche de son échéance. */
export function pickAdviceProject<T extends { status: ProjectStatus; target_amount: number; locked_amount: number; target_date: string | null }>(
  projects: T[],
  now: Date = new Date()
): { project: T; advice: SavingsAdvice } | null {
  const candidates = projects
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => ({ project: p, advice: savingsAdvice(p.target_amount, p.locked_amount, p.target_date, now) }))
    .filter((c): c is { project: T; advice: SavingsAdvice } => c.advice !== null)
    .sort((a, b) => (daysLeft(a.project.target_date, now) ?? 0) - (daysLeft(b.project.target_date, now) ?? 0));
  return candidates[0] ?? null;
}
