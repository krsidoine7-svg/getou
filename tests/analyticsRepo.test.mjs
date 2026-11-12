/**
 * Tests d'intégration analyticsRepo sur SQLite en mémoire — GERETOU
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import { fetchAnalyticsReport } from '../src/services/analytics/analyticsRepo.ts';

let db;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 250000);
  `);
  for (const c of INITIAL_CATEGORIES) {
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default)
      VALUES (?, ?, ?, ?, ?, ?);
    `).run(c.id, c.name, c.icon, c.color, c.type, c.is_default);
  }
});

test('fetchAnalyticsReport : exclusion stricte des virements et calcul fidèle', async () => {
  // Dépense 30 000 en Alimentation
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date)
    VALUES ('t1', 'u1', 30000, 'wave', 'cat_alim', 'EXPENSE', '2026-05-10T12:00:00');
  `).run();

  // Dépense 20 000 en Transport
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date)
    VALUES ('t2', 'u1', 20000, 'wave', 'cat_transp', 'EXPENSE', '2026-05-12T14:00:00');
  `).run();

  // Revenu 150 000 en Salaire
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date)
    VALUES ('t3', 'u1', 150000, 'wave', 'cat_salaire', 'INCOME', '2026-05-01T09:00:00');
  `).run();

  // Virement neutre 50 000 (ne DOIT PAS être comptabilisé)
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, type, date)
    VALUES ('t4', 'u1', 50000, 'wave', 'TRANSFER', '2026-05-11T10:00:00');
  `).run();

  // Transaction supprimée (ne DOIT PAS être comptabilisée)
  db.prepare(`
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, is_deleted)
    VALUES ('t5', 'u1', 100000, 'wave', 'cat_alim', 'EXPENSE', '2026-05-10T15:00:00', 1);
  `).run();

  // Budget mensuel de 100 000 FCFA
  db.prepare(`
    INSERT INTO budgets (id, user_id, period, limit_amount)
    VALUES ('b1', 'u1', 'MONTH', 100000);
  `).run();

  const report = await fetchAnalyticsReport(
    adapter(),
    'u1',
    'MONTH',
    new Date('2026-05-15T12:00:00')
  );

  assert.equal(report.summary.incomeTotal, 150000);
  assert.equal(report.summary.expenseTotal, 50000); // 30k + 20k (hors virement et hors supprimée)
  assert.equal(report.summary.netSavings, 100000);
  assert.equal(report.summary.savingsRate, 67); // 100k / 150k
  assert.equal(report.monthlyBudgetLimit, 100000);

  // Top catégorie : Alimentation (60%)
  assert.equal(report.summary.topExpenseCategory.categoryName, 'Alimentation & Marché');
  assert.equal(report.summary.topExpenseCategory.amount, 30000);
  assert.equal(report.summary.topExpenseCategory.percentage, 60);

  // Diagnostic
  assert.equal(report.diagnostic.tone, 'excellent');
});
