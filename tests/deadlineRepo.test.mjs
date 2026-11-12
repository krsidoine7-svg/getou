/**
 * Tests des échéances sur une vraie base SQLite — GERETOU (étape 7)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import {
  saveDeadline, getDeadline, listDeadlines, payDeadline, markDeadlinePaid, postponeDeadline, deleteDeadline, DeadlineError,
} from '../src/services/agenda/deadlineRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `x${++seq}`;
const base = {
  userId: 'u1', title: 'Facture CIE Électricité', amount: 28000, kind: 'BILL', dueDate: '2026-05-28',
  remindTime: '09:00', remindDaysBefore: 1, recurrence: 'MONTHLY', accountId: 'wave', priority: 'VITAL',
};
const balance = (id) => db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id).balance;

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
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 150000);
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('cash', 'u1', 'Espèces', 'CASH', 20000);
  `);
});

test('création et liste triée par date', async () => {
  await saveDeadline(adapter(), { ...base, title: 'Loyer', kind: 'RENT', dueDate: '2026-06-05', recurrence: 'NONE' }, newId);
  await saveDeadline(adapter(), base, newId);
  const list = await listDeadlines(adapter(), 'u1');
  assert.deepEqual(list.map((d) => d.title), ['Facture CIE Électricité', 'Loyer']);
  assert.equal(list[0].account_name, 'Wave');
  assert.equal(list[0].anchor_day, 28);
});

test('payer : dépense en « Factures », compte débité, échéance réglée, mois suivant créé', async () => {
  const id = await saveDeadline(adapter(), base, newId);
  const { transactionId, nextId } = await payDeadline(adapter(), { userId: 'u1', deadlineId: id, accountId: 'wave' }, newId);
  assert.equal(balance('wave'), 122000);
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);
  assert.equal(tx.type, 'EXPENSE');
  assert.equal(tx.category_id, 'cat_factures');
  assert.equal(tx.urgency, 'CRITICAL');
  assert.equal(db.prepare('SELECT status FROM deadlines WHERE id = ?').get(id).status, 'PAID');
  const next = db.prepare('SELECT * FROM deadlines WHERE id = ?').get(nextId);
  assert.equal(next.due_date, '2026-06-28');
  assert.equal(next.status, 'PENDING');
  assert.deepEqual((await listDeadlines(adapter(), 'u1')).map((d) => d.id), [nextId]);
});

test('solde insuffisant : rien ne bouge', async () => {
  const id = await saveDeadline(adapter(), base, newId);
  await assert.rejects(payDeadline(adapter(), { userId: 'u1', deadlineId: id, accountId: 'cash' }, newId), /il manque 8000 FCFA/);
  assert.equal(balance('cash'), 20000);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM transactions').get().n, 0);
});

test('ancien type « TONTINE » : lu comme « Autre dépense » et réglé en Imprévus', async () => {
  const id = await saveDeadline(adapter(), { ...base, recurrence: 'NONE' }, newId);
  db.prepare("UPDATE deadlines SET kind = 'TONTINE' WHERE id = ?").run(id);
  assert.equal((await getDeadline(adapter(), 'u1', id)).kind, 'OTHER');
  const { transactionId, nextId } = await payDeadline(adapter(), { userId: 'u1', deadlineId: id, accountId: 'wave' }, newId);
  assert.equal(db.prepare('SELECT category_id FROM transactions WHERE id = ?').get(transactionId).category_id, 'cat_imprevus');
  assert.equal(nextId, null);
});

test('« déjà réglé » ne crée aucune dépense ; régler deux fois est refusé', async () => {
  const id = await saveDeadline(adapter(), { ...base, recurrence: 'NONE' }, newId);
  await markDeadlinePaid(adapter(), 'u1', id, newId);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM transactions').get().n, 0);
  assert.equal(balance('wave'), 150000);
  await assert.rejects(payDeadline(adapter(), { userId: 'u1', deadlineId: id, accountId: 'wave' }, newId), DeadlineError);
});

test('reporter et supprimer', async () => {
  const id = await saveDeadline(adapter(), base, newId);
  assert.equal(await postponeDeadline(adapter(), 'u1', id, 1), '2026-05-29');
  await deleteDeadline(adapter(), 'u1', id);
  assert.equal((await listDeadlines(adapter(), 'u1')).length, 0);
});

test('validation', async () => {
  await assert.rejects(saveDeadline(adapter(), { ...base, title: ' ' }, newId), /intitulé/);
  await assert.rejects(saveDeadline(adapter(), { ...base, amount: 0 }, newId), /supérieur à 0/);
  await assert.rejects(saveDeadline(adapter(), { ...base, dueDate: '28/05/2026' }, newId), /Date invalide/);
  await assert.rejects(saveDeadline(adapter(), { ...base, remindTime: '25:00' }, newId), /Heure/);
});
