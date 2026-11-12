/**
 * Échéances : lecture, enregistrement et paiement — GERETOU
 * Module pur : fonctionne avec n'importe quel pilote SQLite via l'interface SqlDb.
 * Les opérations d'écriture multiples doivent être exécutées dans une transaction par l'appelant.
 */

import { KIND_CATEGORY, KIND_LABELS, normalizeKind, nextDueDate, parseDay, addDays } from './deadlineCore.ts';
import type { DeadlineKind, DeadlinePriority, Recurrence } from './deadlineCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface Deadline {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  kind: DeadlineKind;
  due_date: string;
  remind_time: string;
  remind_days_before: number;
  recurrence: Recurrence;
  anchor_day: number | null;
  account_id: string | null;
  priority: DeadlinePriority;
  status: 'PENDING' | 'PAID';
  paid_at: string | null;
  paid_tx_id: string | null;
  notification_id: string | null;
  notes: string | null;
  /** Jointure : compte prévu. */
  account_name?: string | null;
  account_type?: string | null;
}

export interface DeadlineInput {
  userId: string;
  title: string;
  amount: number;
  kind: DeadlineKind;
  dueDate: string;
  remindTime: string;
  remindDaysBefore: number;
  recurrence: Recurrence;
  accountId: string | null;
  priority: DeadlinePriority;
  notes?: string | null;
}

export class DeadlineError extends Error {}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateDeadlineInput(i: Pick<DeadlineInput, 'title' | 'amount' | 'dueDate' | 'remindTime' | 'remindDaysBefore'>): string | null {
  if (i.title.trim().length < 2) return "Donnez un intitulé à l'échéance.";
  if (!Number.isFinite(i.amount) || i.amount <= 0) return 'Saisissez un montant supérieur à 0 FCFA.';
  if (!DAY_RE.test(i.dueDate) || Number.isNaN(parseDay(i.dueDate).getTime())) return 'Date invalide.';
  if (!TIME_RE.test(i.remindTime)) return 'Heure de rappel invalide.';
  if (!(i.remindDaysBefore >= 0 && i.remindDaysBefore <= 30)) return 'Le rappel doit être entre le jour même et 30 jours avant.';
  return null;
}

export async function listDeadlines(db: SqlDb, userId: string, includePaid = false): Promise<Deadline[]> {
  const rows = await db.all<Deadline>(
    `SELECT d.*, a.name AS account_name, a.type AS account_type
     FROM deadlines d LEFT JOIN accounts a ON a.id = d.account_id
     WHERE d.user_id = ? ${includePaid ? '' : "AND d.status = 'PENDING'"}
     ORDER BY d.due_date, d.remind_time, d.title;`,
    [userId]
  );
  return rows.map((d) => ({ ...d, kind: normalizeKind(d.kind) }));
}

export async function getDeadline(db: SqlDb, userId: string, id: string): Promise<Deadline | null> {
  const d = await db.get<Deadline>(
    `SELECT d.*, a.name AS account_name, a.type AS account_type
     FROM deadlines d LEFT JOIN accounts a ON a.id = d.account_id
     WHERE d.id = ? AND d.user_id = ?;`,
    [id, userId]
  );
  return d ? { ...d, kind: normalizeKind(d.kind) } : null;
}

export async function saveDeadline(db: SqlDb, input: DeadlineInput, newId: () => string, editingId?: string): Promise<string> {
  const invalid = validateDeadlineInput(input);
  if (invalid) throw new DeadlineError(invalid);
  const now = new Date().toISOString();
  const anchor = parseDay(input.dueDate).getDate();
  const values = [
    input.title.trim(),
    Math.round(input.amount),
    input.kind,
    input.dueDate,
    input.remindTime,
    input.remindDaysBefore,
    input.recurrence,
    anchor,
    input.accountId,
    input.priority,
    input.notes?.trim() || null,
  ];
  if (editingId) {
    await db.run(
      `UPDATE deadlines SET title = ?, amount = ?, kind = ?, due_date = ?, remind_time = ?, remind_days_before = ?,
         recurrence = ?, anchor_day = ?, account_id = ?, priority = ?, notes = ?, updated_at = ?
       WHERE id = ? AND user_id = ?;`,
      [...values, now, editingId, input.userId]
    );
    return editingId;
  }
  const id = `dl_${newId()}`;
  await db.run(
    `INSERT INTO deadlines (id, user_id, title, amount, kind, due_date, remind_time, remind_days_before, recurrence,
       anchor_day, account_id, priority, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?);`,
    [id, input.userId, ...values, now, now]
  );
  return id;
}

/** Crée l'occurrence suivante d'une échéance récurrente ; renvoie son id ou null. */
async function scheduleNext(db: SqlDb, d: Deadline, newId: () => string): Promise<string | null> {
  const next = nextDueDate(d.due_date, d.recurrence, d.anchor_day ?? undefined);
  if (!next) return null;
  const id = `dl_${newId()}`;
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO deadlines (id, user_id, title, amount, kind, due_date, remind_time, remind_days_before, recurrence,
       anchor_day, account_id, priority, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?);`,
    [id, d.user_id, d.title, d.amount, d.kind, next, d.remind_time, d.remind_days_before, d.recurrence, d.anchor_day, d.account_id, d.priority, d.notes, now, now]
  );
  return id;
}

async function requirePending(db: SqlDb, userId: string, id: string): Promise<Deadline> {
  const d = await getDeadline(db, userId, id);
  if (!d) throw new DeadlineError('Échéance introuvable.');
  if (d.status !== 'PENDING') throw new DeadlineError('Cette échéance est déjà réglée.');
  return d;
}

/**
 * Règle l'échéance depuis un compte : dépense enregistrée (catégorie selon le type),
 * compte débité, échéance marquée réglée, occurrence suivante créée si récurrente.
 */
export async function payDeadline(
  db: SqlDb,
  p: { userId: string; deadlineId: string; accountId: string },
  newId: () => string
): Promise<{ transactionId: string; nextId: string | null }> {
  const d = await requirePending(db, p.userId, p.deadlineId);
  const account = await db.get<{ id: string; name: string; balance: number; is_archived: number }>(
    'SELECT id, name, balance, is_archived FROM accounts WHERE id = ? AND user_id = ?;',
    [p.accountId, p.userId]
  );
  if (!account || account.is_archived) throw new DeadlineError('Compte introuvable ou clôturé.');
  if (account.balance < d.amount) {
    throw new DeadlineError(`Solde insuffisant sur ${account.name} : il manque ${d.amount - account.balance} FCFA.`);
  }

  const now = new Date().toISOString();
  const categoryId = KIND_CATEGORY[d.kind];
  const txId = `tx_dl_${newId()}`;
  await db.run(
    `INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, category_id, type, nature, urgency, provenance, date, notes, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, 'EXPENSE', 'REGULAR', ?, NULL, ?, ?, 0, ?, ?);`,
    [txId, p.userId, d.amount, account.id, categoryId, d.priority === 'VITAL' ? 'CRITICAL' : d.priority === 'HIGH' ? 'HIGH' : 'NORMAL', now, d.title, now, now]
  );
  await db.run('UPDATE accounts SET balance = balance - ?, updated_at = ? WHERE id = ?;', [d.amount, now, account.id]);
  await db.run("UPDATE deadlines SET status = 'PAID', paid_at = ?, paid_tx_id = ?, updated_at = ? WHERE id = ?;", [now, txId, now, d.id]);
  const nextId = await scheduleNext(db, d, newId);
  return { transactionId: txId, nextId };
}

/** « Déjà réglé » : payée en dehors de l'app (aucune dépense créée). */
export async function markDeadlinePaid(db: SqlDb, userId: string, id: string, newId: () => string): Promise<{ nextId: string | null }> {
  const d = await requirePending(db, userId, id);
  const now = new Date().toISOString();
  await db.run("UPDATE deadlines SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ?;", [now, now, d.id]);
  return { nextId: await scheduleNext(db, d, newId) };
}

export async function postponeDeadline(db: SqlDb, userId: string, id: string, days = 1): Promise<string> {
  const d = await requirePending(db, userId, id);
  const due = addDays(d.due_date, days);
  await db.run('UPDATE deadlines SET due_date = ?, updated_at = ? WHERE id = ?;', [due, new Date().toISOString(), d.id]);
  return due;
}

export async function deleteDeadline(db: SqlDb, userId: string, id: string): Promise<void> {
  await db.run('DELETE FROM deadlines WHERE id = ? AND user_id = ?;', [id, userId]);
}

export async function setNotificationId(db: SqlDb, id: string, notificationId: string | null): Promise<void> {
  await db.run('UPDATE deadlines SET notification_id = ? WHERE id = ?;', [notificationId, id]);
}

/** Titre proposé quand l'utilisateur choisit un type sans avoir saisi d'intitulé. */
export function defaultTitle(kind: DeadlineKind): string {
  return { BILL: 'Facture', RENT: 'Loyer', SUBSCRIPTION: 'Abonnement', OTHER: KIND_LABELS.OTHER }[kind];
}
