/**
 * Tests du journal des alertes sur une vraie base SQLite — GERETOU (étape 8)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import {
  insertAlertOnce, listAlerts, unreadCount, markRead, markAllRead, resolveAlert, purgeOldAlerts,
  recordBudgetAlerts, syncDeadlineAlerts, recordBackupAlert,
} from '../src/services/alerts/alertRepo.ts';
import { saveBudget } from '../src/services/budget/budgetRepo.ts';
import { saveDeadline, payDeadline } from '../src/services/agenda/deadlineRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `i${++seq}`;
const now = new Date(2026, 10, 11, 15, 0);

function expense(id, amount, category, date = now) {
  db.prepare(`INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date) VALUES (?, 'u1', ?, 'wave', ?, 'EXPENSE', ?)`)
    .run(id, amount, category, date.toISOString());
}

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  for (const c of INITIAL_CATEGORIES) {
    db.prepare('INSERT INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, c.name, c.icon, c.color, c.type, c.is_default);
  }
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave Principal', 'WAVE', 150000);
  `);
});

test('dédoublonnage par clé, lecture, tout lire', async () => {
  const a = { userId: 'u1', kind: 'INFO', level: 'INFO', title: 'T', body: 'B', dedupeKey: 'k1' };
  assert.ok(await insertAlertOnce(adapter(), a, newId));
  assert.equal(await insertAlertOnce(adapter(), a, newId), null);
  await insertAlertOnce(adapter(), { ...a, dedupeKey: 'k2' }, newId);
  assert.equal(await unreadCount(adapter(), 'u1'), 2);
  const [first] = await listAlerts(adapter(), 'u1');
  await markRead(adapter(), 'u1', first.id);
  assert.equal(await unreadCount(adapter(), 'u1'), 1);
  await markAllRead(adapter(), 'u1');
  assert.equal(await unreadCount(adapter(), 'u1'), 0);
});

test('budget : une alerte au seuil puis une au dépassement, jamais répétées dans le mois', async () => {
  await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 50000, alertThreshold: 0.85 }, newId);
  expense('t1', 28300, 'cat_alim');
  assert.equal((await recordBudgetAlerts(adapter(), 'u1', 28300, 'cat_alim', newId, now)).length, 0);
  expense('t2', 14200, 'cat_alim'); // 42 500 = 85 %
  const w = await recordBudgetAlerts(adapter(), 'u1', 14200, 'cat_alim', newId, now);
  assert.equal(w.length, 1);
  assert.match(w[0].alert.title, /Seuil 85 % atteint : Alimentation/);
  assert.match(w[0].alert.body, /42 500 FCFA \/ 50 000 FCFA consommés \(85 %\)/);
  expense('t3', 9500, 'cat_alim'); // 52 000 > 100 %
  const o = await recordBudgetAlerts(adapter(), 'u1', 9500, 'cat_alim', newId, now);
  assert.equal(o[0].alert.level, 'CRITICAL');
  assert.match(o[0].alert.body, /\+2 000 FCFA/);
  expense('t4', 1000, 'cat_alim');
  assert.equal((await recordBudgetAlerts(adapter(), 'u1', 1000, 'cat_alim', newId, now)).length, 0);
});

test('échéance : alerte quand l’heure du rappel est passée, résolue au paiement', async () => {
  const id = await saveDeadline(adapter(), {
    userId: 'u1', title: 'Facture CIE', amount: 28000, kind: 'BILL', dueDate: '2026-11-12', remindTime: '09:00',
    remindDaysBefore: 1, recurrence: 'NONE', accountId: 'wave', priority: 'VITAL',
  }, newId);
  assert.equal(await syncDeadlineAlerts(adapter(), 'u1', newId, new Date(2026, 10, 11, 8, 0)), 0); // avant 9 h la veille
  assert.equal(await syncDeadlineAlerts(adapter(), 'u1', newId, now), 1);
  assert.equal(await syncDeadlineAlerts(adapter(), 'u1', newId, now), 0, 'pas de doublon');
  let [alert] = await listAlerts(adapter(), 'u1');
  assert.equal(alert.level, 'CRITICAL');
  assert.match(alert.title, /Facture CIE — Demain/);
  await payDeadline(adapter(), { userId: 'u1', deadlineId: id, accountId: 'wave' }, newId);
  await syncDeadlineAlerts(adapter(), 'u1', newId, now);
  [alert] = await listAlerts(adapter(), 'u1');
  assert.ok(alert.resolved_at);
  assert.match(alert.resolution, /^Réglée via Wave Principal à \d\d:\d\d$/);
});

test('sauvegarde, résolution manuelle et purge à 90 jours', async () => {
  const backup = await recordBackupAlert(adapter(), 'u1', 'alex@gmail.com', 1468006, newId);
  assert.match(backup.body, /1,40 Mo/);
  await resolveAlert(adapter(), 'u1', backup.id, 'Ignorée');
  const [r] = await listAlerts(adapter(), 'u1');
  assert.equal(r.resolution, 'Ignorée');
  assert.ok(r.read_at);
  await insertAlertOnce(adapter(), { userId: 'u1', kind: 'INFO', level: 'INFO', title: 'vieille', body: '', createdAt: new Date(2026, 6, 1).toISOString() }, newId);
  assert.equal(await purgeOldAlerts(adapter(), 'u1', now), 1);
  assert.equal((await listAlerts(adapter(), 'u1')).length, 1);
});
