/**
 * Tests de la Corbeille et Restauration — GERETOU (Étape 12)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import {
  softDeleteTransaction,
  restoreTransaction,
  listTrashItems,
  deletePermanently,
  emptyTrash,
  TrashError,
} from '../src/services/trash/trashRepo.ts';

let db;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const balance = (id) => db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id).balance;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 50000);
  `);
  for (const c of INITIAL_CATEGORIES) {
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default)
      VALUES (?, ?, ?, ?, ?, ?);
    `).run(c.id, c.name, c.icon, c.color, c.type, c.is_default);
  }
});

test('soft delete d’une dépense : recrédite le compte et l’envoie dans la corbeille', async () => {
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, is_deleted)
    VALUES ('tx1', 'u1', 15000, 'wave', 'cat_alim', 'EXPENSE', '2026-05-10T12:00:00', 0);
  `).run();

  assert.equal(balance('wave'), 50000);

  // Mise à la corbeille
  await softDeleteTransaction(adapter(), 'u1', 'tx1');

  // Le solde Wave est recrédité (+15 000 FCFA)
  assert.equal(balance('wave'), 65000);

  const trash = await listTrashItems(adapter(), 'u1');
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, 'tx1');
  assert.equal(trash[0].amount, 15000);
  assert.ok(trash[0].deleted_at);
});

test('restauration d’une dépense : redébite le compte et retire de la corbeille', async () => {
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, is_deleted, deleted_at)
    VALUES ('tx1', 'u1', 10000, 'wave', 'cat_alim', 'EXPENSE', '2026-05-10T12:00:00', 1, '2026-05-11T10:00:00');
  `).run();

  assert.equal(balance('wave'), 50000);

  // Restauration
  await restoreTransaction(adapter(), 'u1', 'tx1');

  // Le solde Wave est redébité (-10 000 FCFA)
  assert.equal(balance('wave'), 40000);

  const trash = await listTrashItems(adapter(), 'u1');
  assert.equal(trash.length, 0);

  const row = db.prepare('SELECT is_deleted, deleted_at FROM transactions WHERE id = ?').get('tx1');
  assert.equal(row.is_deleted, 0);
  assert.equal(row.deleted_at, null);
});

test('restauration refusée si solde insuffisant', async () => {
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, is_deleted, deleted_at)
    VALUES ('tx1', 'u1', 80000, 'wave', 'cat_alim', 'EXPENSE', '2026-05-10T12:00:00', 1, '2026-05-11T10:00:00');
  `).run();

  // Solde est 50 000, montant à redéduire 80 000
  await assert.rejects(
    restoreTransaction(adapter(), 'u1', 'tx1'),
    /Solde insuffisant/
  );

  // Rien n'a changé
  assert.equal(balance('wave'), 50000);
  const trash = await listTrashItems(adapter(), 'u1');
  assert.equal(trash.length, 1);
});

test('suppression définitive et vider la corbeille', async () => {
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, type, date, is_deleted)
    VALUES
      ('tx1', 'u1', 5000, 'wave', 'EXPENSE', '2026-05-01', 1),
      ('tx2', 'u1', 7000, 'wave', 'EXPENSE', '2026-05-02', 1),
      ('tx3', 'u1', 9000, 'wave', 'EXPENSE', '2026-05-03', 0);
  `).run();

  // Supprimer définitivement tx1
  await deletePermanently(adapter(), 'u1', 'tx1');
  let trash = await listTrashItems(adapter(), 'u1');
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, 'tx2');

  // Vider la corbeille
  const res = await emptyTrash(adapter(), 'u1');
  assert.equal(res.deletedCount, 1);

  trash = await listTrashItems(adapter(), 'u1');
  assert.equal(trash.length, 0);

  // La transaction active tx3 n'a pas été touchée
  const activeTx = db.prepare('SELECT id FROM transactions WHERE id = ?').get('tx3');
  assert.ok(activeTx);
});
