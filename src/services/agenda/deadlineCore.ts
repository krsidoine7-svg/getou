/**
 * Calendrier des échéances — GERETOU
 * Module pur (testable sous Node). Les dates d'échéance sont des jours locaux « AAAA-MM-JJ ».
 */

export type DeadlineKind = 'BILL' | 'RENT' | 'TONTINE' | 'SUBSCRIPTION' | 'OTHER';
export type Recurrence = 'NONE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type DeadlinePriority = 'NORMAL' | 'HIGH' | 'VITAL';
export type DeadlineBucket = 'overdue' | 'urgent' | 'upcoming';

export const KIND_LABELS: Record<DeadlineKind, string> = {
  BILL: 'Factures',
  RENT: 'Loyer & logement',
  TONTINE: 'Tontine & cercle',
  SUBSCRIPTION: 'Abonnements',
  OTHER: 'Autre dépense',
};

/** Catégorie de dépense utilisée au moment du paiement. */
export const KIND_CATEGORY: Record<DeadlineKind, string> = {
  BILL: 'cat_factures',
  RENT: 'cat_loyer',
  TONTINE: 'cat_tontine',
  SUBSCRIPTION: 'cat_factures',
  OTHER: 'cat_imprevus',
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: 'Une seule fois',
  WEEKLY: 'Hebdo',
  MONTHLY: 'Mensuelle',
  QUARTERLY: 'Trimestre',
};

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDayString(d);
}

/** Ajoute des mois en gardant le jour, ramené au dernier jour du mois si besoin (31 janv. → 28 févr.). */
export function addMonths(day: string, n: number, preferredDay?: number): string {
  const d = parseDay(day);
  const target = preferredDay ?? d.getDate();
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return toDayString(new Date(first.getFullYear(), first.getMonth(), Math.min(target, last)));
}

/** Prochaine date d'une échéance récurrente (null si elle ne se répète pas). */
export function nextDueDate(day: string, recurrence: Recurrence, preferredDay?: number): string | null {
  switch (recurrence) {
    case 'WEEKLY':
      return addDays(day, 7);
    case 'MONTHLY':
      return addMonths(day, 1, preferredDay);
    case 'QUARTERLY':
      return addMonths(day, 3, preferredDay);
    default:
      return null;
  }
}

/** Nombre de jours entre aujourd'hui et l'échéance (négatif = en retard). */
export function daysUntil(day: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseDay(day).getTime() - today.getTime()) / 86_400_000);
}

export function bucketOf(day: string, now: Date = new Date()): DeadlineBucket {
  const n = daysUntil(day, now);
  if (n < 0) return 'overdue';
  if (n <= 2) return 'urgent';
  return 'upcoming';
}

/** « Aujourd'hui », « Demain, 28 mai », « Vendredi 30 mai », « Il y a 2 jours ». */
export function dueLabel(day: string, now: Date = new Date()): string {
  const n = daysUntil(day, now);
  const d = parseDay(day);
  const dayMonth = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return `Demain, ${dayMonth}`;
  if (n === -1) return 'Hier';
  if (n < 0) return `En retard de ${-n} jours`;
  if (n < 7) {
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayMonth}`;
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Moment du rappel : `daysBefore` jours avant l'échéance, à l'heure « HH:MM » (heure locale). */
export function reminderDate(day: string, time: string, daysBefore: number): Date {
  const [h, m] = time.split(':').map(Number);
  const d = parseDay(addDays(day, -daysBefore));
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Raccourcis de la maquette : Demain, Dans 3 j, Fin de mois, Le 5 prochain. */
export function quickDates(now: Date = new Date()): { label: string; day: string }[] {
  const today = toDayString(now);
  const endOfMonth = toDayString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const fifth = now.getDate() < 5 ? toDayString(new Date(now.getFullYear(), now.getMonth(), 5)) : toDayString(new Date(now.getFullYear(), now.getMonth() + 1, 5));
  return [
    { label: 'Demain', day: addDays(today, 1) },
    { label: 'Dans 3 j', day: addDays(today, 3) },
    { label: 'Fin de mois', day: endOfMonth },
    { label: 'Le 5 prochain', day: fifth },
  ];
}

/** Phrase décrivant la récurrence (« Le 30 de chaque mois »). */
export function recurrenceRule(day: string, recurrence: Recurrence): string {
  const d = parseDay(day);
  if (recurrence === 'WEEKLY') return `Chaque ${d.toLocaleDateString('fr-FR', { weekday: 'long' })}`;
  if (recurrence === 'MONTHLY') return `Le ${d.getDate()} de chaque mois`;
  if (recurrence === 'QUARTERLY') return `Le ${d.getDate()}, tous les 3 mois`;
  return 'Une seule fois';
}

/** Les 7 jours (lundi → dimanche) de la semaine contenant `now`. */
export function weekDays(now: Date = new Date()): string[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => toDayString(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}
