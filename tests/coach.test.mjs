/**
 * Tests du Coach Financier Ivoirien (Nouchi) & Alertes — GERETOU
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import {
  pickIncomeCoachQuote,
  pickBudgetCoachQuote,
  pickStaleProjectCoachQuote,
  pickShoppingCoachQuote,
  getWeekKey,
  INCOME_COACH_QUOTES,
  BUDGET_OVER_QUOTES,
} from '../src/services/coach/coachCore.ts';
import {
  recordCoachIncomeAlert,
  syncCoachStaleProjectsAlerts,
  syncCoachShoppingAlerts,
  recordBudgetAlerts,
  listAlerts,
} from '../src/services/alerts/alertRepo.ts';
import { saveBudget } from '../src/services/budget/budgetRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `i${++seq}`;
const now = new Date(2026, 10, 11, 15, 0);

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  for (const c of INITIAL_CATEGORIES) {
    db.prepare('INSERT INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)')
      .run(c.id, c.name, c.icon, c.color, c.type, c.is_default);
  }
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'test@geretou.ci', 'hash');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave Principal', 'WAVE', 100000);
    INSERT INTO accounts (id, user_id, name, type, sub_type, balance) VALUES ('coffre', 'u1', 'Coffre Moto', 'VAULT', 'VAULT', 20000);
  `);
});

test('citations du coach : génère des messages ivoiriens authentiques', () => {
  const incomeQuote = pickIncomeCoachQuote();
  assert.ok(INCOME_COACH_QUOTES.includes(incomeQuote));

  const overQuote = pickBudgetCoachQuote('over');
  assert.ok(BUDGET_OVER_QUOTES.includes(overQuote));

  const projQuote = pickStaleProjectCoachQuote('Achat Terrain');
  assert.match(projQuote, /Achat Terrain/);
  assert.match(projQuote, /dort depuis dêh|attend son djaï|oublié/);

  const shopQuote = pickShoppingCoachQuote('Riz, Huile');
  assert.match(shopQuote, /Riz, Huile/);
});

test('getWeekKey : formate bien l’année et le numéro de semaine', () => {
  const k = getWeekKey(new Date(2026, 10, 11)); // Novembre 2026
  assert.match(k, /^2026-W\d{2}$/);
});

test('recordCoachIncomeAlert : crée une alerte lors d’une entrée de djaï', async () => {
  const alert = await recordCoachIncomeAlert(adapter(), 'u1', 75000, newId, now);
  assert.ok(alert);
  assert.equal(alert.kind, 'INFO');
  assert.equal(alert.level, 'SUCCESS');
  assert.match(alert.title, /Coach Nouchi : Djaï rentré/);
  assert.match(alert.body, /\+75 000 FCFA reçus/);

  const alerts = await listAlerts(adapter(), 'u1');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].id, alert.id);
});

test('syncCoachStaleProjectsAlerts : alerte pour un projet actif dormant depuis > 3 jours', async () => {
  const fourDaysAgo = new Date(now.getTime() - 4 * 86_400_000).toISOString();
  db.prepare(`
    INSERT INTO projects (id, user_id, title, target_amount, locked_amount, account_vault_id, status, created_at, updated_at)
    VALUES ('p1', 'u1', 'Moto Jakarta', 500000, 50000, 'coffre', 'ACTIVE', ?, ?);
  `).run(fourDaysAgo, fourDaysAgo);

  const created = await syncCoachStaleProjectsAlerts(adapter(), 'u1', newId, now);
  assert.equal(created.length, 1);
  assert.equal(created[0].level, 'WARNING');
  assert.match(created[0].title, /Ton projet dort/);
  assert.match(created[0].body, /Moto Jakarta/);

  // Dédoublonnage : ne pas répéter la même semaine
  const again = await syncCoachStaleProjectsAlerts(adapter(), 'u1', newId, now);
  assert.equal(again.length, 0);
});

test('syncCoachShoppingAlerts : alerte pour des stocks en rupture', async () => {
  db.prepare(`
    INSERT INTO stocks (id, user_id, name, category, current_qty, unit, min_threshold)
    VALUES ('s1', 'u1', 'Sac de Riz 25kg', 'FOOD', 0, 'SAC', 1);
  `).run();

  const alert = await syncCoachShoppingAlerts(adapter(), 'u1', newId, now);
  assert.ok(alert);
  assert.match(alert.title, /Ravitaillement/);
  assert.match(alert.body, /Sac de Riz 25kg/);

  // Dédoublonnage hebdomadaire
  const again = await syncCoachShoppingAlerts(adapter(), 'u1', newId, now);
  assert.equal(again, null);
});

test('recordBudgetAlerts : intègre la touche Coach Nouchi sur dépassement', async () => {
  await saveBudget(adapter(), { userId: 'u1', period: 'MONTH', categoryId: 'cat_alim', limitAmount: 30000, alertThreshold: 0.8 }, newId);
  db.prepare(`INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date) VALUES ('tx1', 'u1', 35000, 'wave', 'cat_alim', 'EXPENSE', ?)`)
    .run(now.toISOString());

  const created = await recordBudgetAlerts(adapter(), 'u1', 35000, 'cat_alim', newId, now);
  assert.equal(created.length, 1);
  assert.equal(created[0].alert.level, 'CRITICAL');
  assert.match(created[0].alert.body, /Coach :/);
});
