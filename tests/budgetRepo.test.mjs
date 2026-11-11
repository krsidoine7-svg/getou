/**
 * Tests des budgets sur une vraie base SQLite — GERETOU (étapes 6.1 / 6.3)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/services/db/schema.ts';
import { listBudgets, saveBudget, removeBudget, spentInPeriod, BudgetError } from '../src/services/budget/budgetRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `b${++seq}`;
const now = new Date(2026, 10, 11, 15, 0);
const iso = (d) => d.toISOString();

function tx(id, type, amount, category, date, deleted = 0) {
  db.prepare(`INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, is_deleted)
              VALUES (?, 'u1', ?, 'wave', ?, ?, ?, ?)`).run(id, amount, category, type, iso(date), deleted);
}

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 0);
    INSERT INTO categories (id, name, icon, color, type) VALUES ('cat_alim', 'Alimentation', 'shopping-cart', '#10B981', 'EXPENSE');
    INSERT INTO categories (id, name, icon, color, type) VALUES ('cat_transp', 'Transport', 'navigation', '#3B82F6', 'EXPENSE');
  `);
  tx('t1', 'EXPENSE', 30000, 'cat_alim', new Date(2026, 10, 2, 10));
  tx('t2', 'EXPENSE', 12500, 'cat_alim', new Date(2026, 10, 11, 9));     // aujourd'hui
  tx('t3', 'EXPENSE', 14000, 'cat_transp', new Date(2026, 10, 5, 8));
  tx('t4', 'EXPENSE', 99999, 'cat_alim', new Date(2026, 9, 30, 12));     // mois précédent
  tx('t5', 'EXPENSE', 88888, 'cat_alim', new Date(2026, 10, 3, 12), 1);  // supprimée
  tx('t6', 'INCOME', 500000, null, new Date(2026, 10, 1, 9));            // revenu
  tx('t7', 'TRANSFER', 70000, null, new Date(2026, 10, 4, 9));           // virement interne
});

test('seules les dépenses non supprimées de la période comptent', async () => {
  assert.equal(await spentInPeriod(adapter(), 'u1', 'MONTH', null, now), 56500);
  assert.equal(await spentInPeriod(adapter(), 'u1', 'MONTH', 'cat_alim', now), 42500);
  assert.equal(await spentInPeriod(adapter(), 'u1', 'DAY', null, now), 12500);
});

test('liste : global d’abord, avec progression calculée', async () => {
  await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 50000, alertThreshold: 0.85 }, newId);
  await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: null, limitAmount: 350000, alertThreshold: 0.8 }, newId);
  const list = await listBudgets(adapter(), 'u1', now);
  assert.deepEqual(list.map((b) => [b.category_id, b.progress.spent, b.progress.status]), [
    [null, 56500, 'healthy'],
    ['cat_alim', 42500, 'warning'],
  ]);
  assert.equal(list[1].category_name, 'Alimentation');
});

test('un seul plafond par période et catégorie : le second met à jour le premier', async () => {
  const a = await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 50000, alertThreshold: 0.8 }, newId);
  const b = await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 60000, alertThreshold: 0.9 }, newId);
  assert.equal(a, b);
  const rows = db.prepare('SELECT * FROM budgets WHERE is_active = 1').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].limit_amount, 60000);
});

test('modifier vers un couple déjà pris est refusé', async () => {
  await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 50000, alertThreshold: 0.8 }, newId);
  const t = await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_transp', limitAmount: 25000, alertThreshold: 0.8 }, newId);
  await assert.rejects(
    saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 1, alertThreshold: 0.8 }, newId, t),
    BudgetError
  );
});

test('validation et suppression', async () => {
  await assert.rejects(saveBudget(adapter(), { userId: 'u1', period: 'DAY', categoryId: null, limitAmount: 0, alertThreshold: 0.8 }, newId), /supérieur à 0/);
  const id = await saveBudget(adapter(), { userId: 'u1', period: 'DAY', categoryId: null, limitAmount: 20000, alertThreshold: 0.8 }, newId);
  await removeBudget(adapter(), 'u1', id);
  assert.equal((await listBudgets(adapter(), 'u1', now)).length, 0);
});
