/**
 * Logique des alertes — GERETOU
 * Module pur (testable sous Node).
 */

export type AlertKind = 'DEADLINE' | 'BUDGET' | 'BACKUP' | 'INFO';
export type AlertLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
export type AlertSection = 'today' | 'week' | 'older';

export interface AlertRecord {
  id: string;
  user_id: string;
  kind: AlertKind;
  level: AlertLevel;
  title: string;
  body: string;
  ref_id: string | null;
  dedupe_key: string | null;
  meta: string | null;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
}

/** Réglages des notifications (stockés sur le téléphone). */
export interface AlertPrefs {
  deadlineReminders: boolean;
  budgetThreshold: boolean;
  budgetOver: boolean;
  backupSuccess: boolean;
  /** Masque les montants dans le texte des notifications (écran verrouillé). */
  hideAmounts: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  deadlineReminders: true,
  budgetThreshold: true,
  budgetOver: true,
  backupSuccess: false,
  hideAmounts: false,
};

export const RETENTION_DAYS = 90;

// ── Budgets ────────────────────────────────────────────

export interface BudgetSnapshot {
  id: string;
  category_id: string | null;
  category_name: string | null;
  period: 'DAY' | 'MONTH' | 'YEAR';
  alert_threshold: number;
  limit: number;
  /** Dépensé APRÈS la nouvelle dépense. */
  spent: number;
  /** Début de la période (sert à ne pas répéter l'alerte dans la même période). */
  periodStart: string;
}

export interface BudgetCrossing {
  budget: BudgetSnapshot;
  level: 'warning' | 'over';
  dedupeKey: string;
}

/**
 * Seuils franchis par une dépense de `amount` (catégorie `categoryId`).
 * Un budget global est concerné par toutes les dépenses, un budget de catégorie seulement par la sienne.
 * Si la dépense franchit à la fois le seuil et 100 %, seule l'alerte « dépassé » est émise.
 */
export function budgetCrossings(budgets: BudgetSnapshot[], amount: number, categoryId: string | null): BudgetCrossing[] {
  const out: BudgetCrossing[] = [];
  for (const b of budgets) {
    if (b.limit <= 0) continue;
    if (b.category_id && b.category_id !== categoryId) continue;
    const before = (b.spent - amount) / b.limit;
    const after = b.spent / b.limit;
    let level: BudgetCrossing['level'] | null = null;
    if (before < 1 && after >= 1) level = 'over';
    else if (before < b.alert_threshold && after >= b.alert_threshold) level = 'warning';
    if (level) out.push({ budget: b, level, dedupeKey: `budget:${b.id}:${b.periodStart}:${level}` });
  }
  return out;
}

// ── Présentation ───────────────────────────────────────

export function sectionOf(createdAt: string, now: Date = new Date()): AlertSection {
  const d = new Date(createdAt);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startToday) return 'today';
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 6);
  return d >= startWeek ? 'week' : 'older';
}

export type AlertFilter = 'ALL' | 'UNREAD' | 'ACTION' | 'RESOLVED';

/** « Action requise » = alerte critique ou d'avertissement pas encore résolue. */
export function needsAction(a: AlertRecord): boolean {
  return !a.resolved_at && (a.level === 'CRITICAL' || a.level === 'WARNING');
}

export function filterAlerts(alerts: AlertRecord[], kind: AlertKind | 'ALL', filter: AlertFilter): AlertRecord[] {
  return alerts.filter((a) => {
    if (kind !== 'ALL' && a.kind !== kind) return false;
    if (filter === 'UNREAD') return !a.read_at;
    if (filter === 'ACTION') return needsAction(a);
    if (filter === 'RESOLVED') return !!a.resolved_at;
    return true;
  });
}

/** Texte de notification : montants masqués si demandé (« 28 000 FCFA » → « montant masqué »). */
export function maskAmounts(text: string, hide: boolean): string {
  return hide ? text.replace(/[+-]?\d{1,3}(?:[\s  ]\d{3})*(?:[.,]\d+)?\s?(?:FCFA|F)\b/g, '•••') : text;
}
