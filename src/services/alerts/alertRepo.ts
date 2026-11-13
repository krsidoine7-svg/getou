/**
 * Journal des alertes — GERETOU
 * Module pur : fonctionne avec n'importe quel pilote SQLite via l'interface SqlDb.
 */

import { budgetCrossings, RETENTION_DAYS } from './alertCore.ts';
import type { AlertKind, AlertLevel, AlertRecord, BudgetCrossing, BudgetSnapshot } from './alertCore.ts';
import { listBudgets } from '../budget/budgetRepo.ts';
import { periodRange } from '../budget/budgetCalc.ts';
import { daysUntil, dueLabel, reminderDate } from '../agenda/deadlineCore.ts';
import {
  pickBudgetCoachQuote,
  pickIncomeCoachQuote,
  pickStaleProjectCoachQuote,
  pickShoppingCoachQuote,
  getWeekKey,
} from '../coach/coachCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface NewAlert {
  userId: string;
  kind: AlertKind;
  level: AlertLevel;
  title: string;
  body: string;
  refId?: string | null;
  dedupeKey?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
}

const fcfa = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

/** Insère l'alerte sauf si une alerte de même clé existe déjà. Renvoie l'alerte créée ou null. */
export async function insertAlertOnce(db: SqlDb, a: NewAlert, newId: () => string): Promise<AlertRecord | null> {
  if (a.dedupeKey) {
    const existing = await db.get<{ id: string }>('SELECT id FROM alerts WHERE dedupe_key = ?;', [a.dedupeKey]);
    if (existing) return null;
  }
  const id = `al_${newId()}`;
  const createdAt = a.createdAt ?? new Date().toISOString();
  await db.run(
    `INSERT INTO alerts (id, user_id, kind, level, title, body, ref_id, dedupe_key, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [id, a.userId, a.kind, a.level, a.title, a.body, a.refId ?? null, a.dedupeKey ?? null, a.meta ? JSON.stringify(a.meta) : null, createdAt]
  );
  return db.get<AlertRecord>('SELECT * FROM alerts WHERE id = ?;', [id]);
}

export async function listAlerts(db: SqlDb, userId: string): Promise<AlertRecord[]> {
  return db.all<AlertRecord>('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC;', [userId]);
}

export async function unreadCount(db: SqlDb, userId: string): Promise<number> {
  const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM alerts WHERE user_id = ? AND read_at IS NULL;', [userId]);
  return row?.n ?? 0;
}

export async function markRead(db: SqlDb, userId: string, id: string): Promise<void> {
  await db.run('UPDATE alerts SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?;', [new Date().toISOString(), id, userId]);
}

export async function markAllRead(db: SqlDb, userId: string): Promise<void> {
  await db.run('UPDATE alerts SET read_at = ? WHERE user_id = ? AND read_at IS NULL;', [new Date().toISOString(), userId]);
}

/** Marque l'alerte résolue (et lue) avec un court texte d'issue. */
export async function resolveAlert(db: SqlDb, userId: string, id: string, resolution: string): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    'UPDATE alerts SET resolved_at = COALESCE(resolved_at, ?), resolution = COALESCE(resolution, ?), read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?;',
    [now, resolution, now, id, userId]
  );
}

/** Supprime les alertes de plus de 90 jours. Renvoie le nombre supprimé. */
export async function purgeOldAlerts(db: SqlDb, userId: string, now: Date = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();
  const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM alerts WHERE user_id = ? AND created_at < ?;', [userId, limit]);
  await db.run('DELETE FROM alerts WHERE user_id = ? AND created_at < ?;', [userId, limit]);
  return row?.n ?? 0;
}

// ── Budgets ────────────────────────────────────────────

/**
 * À appeler juste après l'enregistrement d'une dépense : crée les alertes des plafonds franchis.
 * Renvoie les alertes nouvellement créées (pour la notification sur le téléphone).
 */
export async function recordBudgetAlerts(
  db: SqlDb,
  userId: string,
  amount: number,
  categoryId: string | null,
  newId: () => string,
  now: Date = new Date()
): Promise<{ alert: AlertRecord; crossing: BudgetCrossing }[]> {
  const budgets = await listBudgets(db, userId, now);
  const snapshots: BudgetSnapshot[] = budgets.map((b) => ({
    id: b.id,
    category_id: b.category_id,
    category_name: b.category_name,
    period: b.period,
    alert_threshold: b.alert_threshold,
    limit: b.limit_amount,
    spent: b.progress.spent,
    periodStart: periodRange(b.period, now).start.toISOString().slice(0, 10),
  }));
  const created: { alert: AlertRecord; crossing: BudgetCrossing }[] = [];
  for (const crossing of budgetCrossings(snapshots, amount, categoryId)) {
    const b = crossing.budget;
    const name = b.category_name ?? (b.period === 'DAY' ? 'Plafond journalier' : 'Budget mensuel global');
    const pct = Math.round((b.spent / b.limit) * 100);
    const over = crossing.level === 'over';
    const coachAdvice = pickBudgetCoachQuote(over ? 'over' : 'warning');
    const alert = await insertAlertOnce(
      db,
      {
        userId,
        kind: 'BUDGET',
        level: over ? 'CRITICAL' : 'WARNING',
        title: over ? `Plafond dépassé : ${name}` : `Seuil ${Math.round(b.alert_threshold * 100)} % atteint : ${name}`,
        body: over
          ? `${fcfa(b.spent)} dépensés pour un plafond de ${fcfa(b.limit)} (+${fcfa(b.spent - b.limit)}).\nCoach : ${coachAdvice}`
          : `${fcfa(b.spent)} / ${fcfa(b.limit)} consommés (${pct} %). Il reste ${fcfa(b.limit - b.spent)}.\nCoach : ${coachAdvice}`,
        refId: b.id,
        dedupeKey: crossing.dedupeKey,
        meta: { spent: b.spent, limit: b.limit, ratio: b.spent / b.limit, coachAdvice },
        createdAt: now.toISOString(),
      },
      newId
    );
    if (alert) created.push({ alert, crossing });
  }
  return created;
}

// ── Échéances ──────────────────────────────────────────

interface DeadlineRow {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  remind_time: string;
  remind_days_before: number;
  priority: string;
  status: string;
  paid_at: string | null;
  paid_tx_id: string | null;
  paid_account: string | null;
}

/**
 * Crée l'alerte des échéances dont l'heure de rappel est passée,
 * et marque résolues celles dont l'échéance a été réglée.
 */
export async function syncDeadlineAlerts(db: SqlDb, userId: string, newId: () => string, now: Date = new Date()): Promise<number> {
  const rows = await db.all<DeadlineRow>(
    `SELECT d.id, d.title, d.amount, d.due_date, d.remind_time, d.remind_days_before, d.priority, d.status, d.paid_at, d.paid_tx_id,
            a.name AS paid_account
     FROM deadlines d
     LEFT JOIN transactions t ON t.id = d.paid_tx_id
     LEFT JOIN accounts a ON a.id = t.account_id
     WHERE d.user_id = ?;`,
    [userId]
  );
  let created = 0;
  for (const d of rows) {
    if (d.status === 'PENDING') {
      const remindAt = reminderDate(d.due_date, d.remind_time, d.remind_days_before);
      if (remindAt.getTime() > now.getTime()) continue;
      const days = daysUntil(d.due_date, now);
      const alert = await insertAlertOnce(
        db,
        {
          userId,
          kind: 'DEADLINE',
          level: days <= 1 || d.priority === 'VITAL' ? 'CRITICAL' : 'WARNING',
          title: `${d.title} — ${dueLabel(d.due_date, now)}`,
          body: `${fcfa(d.amount)} à régler${d.priority === 'VITAL' ? ' (risque de coupure)' : ''}.`,
          refId: d.id,
          dedupeKey: `deadline:${d.id}:${d.due_date}`,
          createdAt: remindAt.toISOString(),
        },
        newId
      );
      if (alert) created++;
    } else if (d.status === 'PAID') {
      const when = d.paid_at ? new Date(d.paid_at) : now;
      const hhmm = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
      const resolution = d.paid_account ? `Réglée via ${d.paid_account} à ${hhmm}` : `Marquée réglée à ${hhmm}`;
      await db.run(
        `UPDATE alerts SET resolved_at = COALESCE(resolved_at, ?), resolution = COALESCE(resolution, ?)
         WHERE user_id = ? AND kind = 'DEADLINE' AND ref_id = ? AND resolved_at IS NULL;`,
        [d.paid_at ?? now.toISOString(), resolution, userId, d.id]
      );
    }
  }
  return created;
}

// ── Sauvegarde ─────────────────────────────────────────

export async function recordBackupAlert(db: SqlDb, userId: string, email: string, bytes: number, newId: () => string): Promise<AlertRecord | null> {
  const size = bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko` : `${(bytes / 1048576).toFixed(2).replace('.', ',')} Mo`;
  return insertAlertOnce(
    db,
    {
      userId,
      kind: 'BACKUP',
      level: 'SUCCESS',
      title: 'Sauvegarde Google Drive réussie',
      body: `${size} enregistrés dans l'espace privé de GERETOU sur ${email}.`,
      dedupeKey: null,
    },
    newId
  );
}

// ── Coach Financier Ivoirien (Nouchi) ──────────────────

/**
 * Alerte d'encouragement / rappel d'épargne après une rentrée de fonds (djaï).
 */
export async function recordCoachIncomeAlert(
  db: SqlDb,
  userId: string,
  amount: number,
  newId: () => string,
  now: Date = new Date()
): Promise<AlertRecord | null> {
  const quote = pickIncomeCoachQuote();
  return insertAlertOnce(
    db,
    {
      userId,
      kind: 'INFO',
      level: 'SUCCESS',
      title: 'Coach Nouchi : Djaï rentré ! 💰',
      body: `${quote}\n(+${fcfa(amount)} reçus)`,
      dedupeKey: null,
      meta: { amount, kind: 'COACH_INCOME' },
      createdAt: now.toISOString(),
    },
    newId
  );
}

/**
 * Rappels de projets actifs sans aucun versement / avancement depuis plus de 3 jours.
 * Dédoublonné par semaine pour ne pas spammer.
 */
export async function syncCoachStaleProjectsAlerts(
  db: SqlDb,
  userId: string,
  newId: () => string,
  now: Date = new Date()
): Promise<AlertRecord[]> {
  const weekKey = getWeekKey(now);
  const rows = await db.all<{ id: string; title: string; locked_amount: number; target_amount: number; updated_at: string; created_at: string }>(
    `SELECT id, title, locked_amount, target_amount, updated_at, created_at
     FROM projects
     WHERE user_id = ? AND status = 'ACTIVE' AND locked_amount < target_amount;`,
    [userId]
  );
  const threeDaysAgo = now.getTime() - 3 * 86_400_000;
  const created: AlertRecord[] = [];
  for (const p of rows) {
    const lastActive = new Date(p.updated_at || p.created_at).getTime();
    if (lastActive <= threeDaysAgo) {
      const alert = await insertAlertOnce(
        db,
        {
          userId,
          kind: 'INFO',
          level: 'WARNING',
          title: 'Coach Nouchi : Ton projet dort ! 🎯',
          body: pickStaleProjectCoachQuote(p.title),
          refId: p.id,
          dedupeKey: `coach:stale_project:${p.id}:${weekKey}`,
          meta: { projectId: p.id, title: p.title, kind: 'COACH_PROJECT' },
          createdAt: now.toISOString(),
        },
        newId
      );
      if (alert) created.push(alert);
    }
  }
  return created;
}

/**
 * Rappels des articles de courses ou stocks en rupture / sous le seuil minimum.
 * Dédoublonné par semaine.
 */
export async function syncCoachShoppingAlerts(
  db: SqlDb,
  userId: string,
  newId: () => string,
  now: Date = new Date()
): Promise<AlertRecord | null> {
  const weekKey = getWeekKey(now);
  const lowStocks = await db.all<{ name: string }>(
    `SELECT name FROM stocks WHERE user_id = ? AND current_qty <= min_threshold LIMIT 3;`,
    [userId]
  );
  if (lowStocks.length === 0) {
    const grocery = await db.get<{ name: string }>(
      `SELECT s.name FROM grocery_items g JOIN stocks s ON s.id = g.stock_id WHERE s.user_id = ? AND g.is_purchased = 0 LIMIT 1;`,
      [userId]
    );
    if (!grocery) return null;
    lowStocks.push(grocery);
  }
  const sampleName = lowStocks.map((s) => s.name).join(', ');
  return insertAlertOnce(
    db,
    {
      userId,
      kind: 'INFO',
      level: 'INFO',
      title: 'Coach Nouchi : Ravitaillement prévu 🛒',
      body: pickShoppingCoachQuote(sampleName),
      dedupeKey: `coach:shopping:${userId}:${weekKey}`,
      meta: { kind: 'COACH_SHOPPING' },
      createdAt: now.toISOString(),
    },
    newId
  );
}
