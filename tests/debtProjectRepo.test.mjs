/**
 * Tests dettes / créances et projets sur une vraie base SQLite — GERETOU (étape 9)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/services/db/schema.ts';
import { createDebt, recordRepayment, listDebts, deleteDebt, DebtError } from '../src/services/debts/debtRepo.ts';
import { createProject, fundProject, withdrawFromProject, listProjects, abandonProject, ProjectError } from '../src/services/projects/projectRepo.ts';
import { spentInPeriod } from '../src/services/budget/budgetRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `z${++seq}`;
const balance = (id) => db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id).balance;

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 150000);
    INSERT INTO accounts (id, user_id, name, type, sub_type, balance) VALUES ('momo_ep', 'u1', 'MoMo Épargne', 'MOMO', 'SAVINGS', 0);
  `);
});

test('prêter (créance) : l’argent sort du compte, sans dépense ni revenu', async () => {
  await createDebt(adapter(), { userId: 'u1', type: 'CREDIT', personName: 'Moussa Koné', phone: '0700000000', amount: 30000, accountId: 'wave' }, newId);
  assert.equal(balance('wave'), 120000);
  const tx = db.prepare('SELECT * FROM transactions').get();
  assert.equal(tx.type, 'TRANSFER');
  assert.equal(tx.provenance, 'DEBT_OUT');
  assert.equal(tx.notes, 'Prêt à Moussa Koné');
  assert.equal(await spentInPeriod(adapter(), 'u1', 'MONTH', null), 0, 'hors budget');
});

test('encaisser un remboursement partiel puis le solde', async () => {
  const id = await createDebt(adapter(), { userId: 'u1', type: 'CREDIT', personName: 'Moussa', amount: 30000, accountId: 'wave' }, newId);
  assert.deepEqual(await recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 10000, accountId: 'wave' }, newId), { remaining: 20000, status: 'PARTIAL' });
  assert.equal(balance('wave'), 130000);
  await assert.rejects(recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 25000, accountId: 'wave' }, newId), /dépasse le reste dû/);
  assert.deepEqual(await recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 20000, accountId: null }, newId), { remaining: 0, status: 'SETTLED' });
  assert.equal(balance('wave'), 130000, 'réglé hors compte : aucun mouvement');
  await assert.rejects(recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 1, accountId: 'wave' }, newId), /déjà soldé/);
});

test('dette existante sans mouvement, versement depuis le compte, solde insuffisant refusé', async () => {
  const id = await createDebt(adapter(), { userId: 'u1', type: 'DEBT', personName: 'Mutuelle santé', amount: 200000, accountId: null }, newId);
  assert.equal(balance('wave'), 150000);
  await recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 35000, accountId: 'wave' }, newId);
  assert.equal(balance('wave'), 115000);
  await assert.rejects(recordRepayment(adapter(), { userId: 'u1', debtId: id, amount: 120000, accountId: 'wave' }, newId), /Solde insuffisant/);
  const [d] = await listDebts(adapter(), 'u1');
  assert.equal(d.remaining_amount, 165000);
  await assert.rejects(deleteDebt(adapter(), 'u1', id), DebtError);
});

test('projet avec nouveau coffre : alimenter, retirer, objectif atteint', async () => {
  const id = await createProject(adapter(), { userId: 'u1', title: 'Ordinateur', targetAmount: 100000, targetDate: '2026-12-31', priority: 'HIGH', status: 'IDEA', newVaultType: 'WAVE' }, newId);
  let [p] = await listProjects(adapter(), 'u1');
  assert.equal(p.vault_name, 'Coffre Ordinateur');
  assert.equal(db.prepare('SELECT sub_type FROM accounts WHERE id = ?').get(p.account_vault_id).sub_type, 'VAULT');
  await fundProject(adapter(), { userId: 'u1', projectId: id, fromAccountId: 'wave', amount: 60000 }, newId);
  assert.equal(balance('wave'), 90000);
  [p] = await listProjects(adapter(), 'u1');
  assert.deepEqual([p.locked_amount, p.status, p.vault_balance], [60000, 'ACTIVE', 60000]);
  await assert.rejects(withdrawFromProject(adapter(), { userId: 'u1', projectId: id, toAccountId: 'wave', amount: 70000 }, newId), ProjectError);
  await withdrawFromProject(adapter(), { userId: 'u1', projectId: id, toAccountId: 'wave', amount: 10000 }, newId);
  const r = await fundProject(adapter(), { userId: 'u1', projectId: id, fromAccountId: 'wave', amount: 50000 }, newId);
  assert.deepEqual(r, { locked: 100000, completed: true });
  assert.equal(db.prepare("SELECT COUNT(*) n FROM transactions WHERE type IN ('EXPENSE','INCOME')").get().n, 0, 'épargner n’est pas dépenser');
});

test('projet sur un coffre existant, solde insuffisant, abandon', async () => {
  const id = await createProject(adapter(), { userId: 'u1', title: 'Voyage', targetAmount: 300000, priority: 'MEDIUM', status: 'ACTIVE', vaultAccountId: 'momo_ep' }, newId);
  await assert.rejects(fundProject(adapter(), { userId: 'u1', projectId: id, fromAccountId: 'wave', amount: 200000 }, newId), /Solde insuffisant/);
  await abandonProject(adapter(), 'u1', id);
  assert.equal((await listProjects(adapter(), 'u1')).length, 0);
  await assert.rejects(createProject(adapter(), { userId: 'u1', title: 'X', targetAmount: 0, priority: 'LOW', status: 'IDEA', newVaultType: 'WAVE' }, newId), /nom|objectif/);
});
