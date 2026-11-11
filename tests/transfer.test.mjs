/**
 * Tests du virement interne neutre — GERETOU (étape 5.4)
 * Sur une vraie base SQLite avec le schéma de l'application.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/services/db/schema.ts';
import { executeTransfer, validateTransferInput, TransferError, FEES_CATEGORY } from '../src/services/account/transferCore.ts';

let db, seq;
const adapter = () => ({
  get: async (sql, params = []) => db.prepare(sql).get(...params) ?? null,
  run: async (sql, params = []) => { db.prepare(sql).run(...params); },
});
const newId = () => `t${++seq}`;
const balance = (id) => db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id).balance;

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 100000);
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('momo', 'u1', 'MoMo', 'MOMO', 0);
    INSERT INTO accounts (id, user_id, name, type, balance, is_archived) VALUES ('old', 'u1', 'Ancien', 'CASH', 0, 1);
  `);
});

test('virement simple : débit et crédit du même montant, total inchangé', async () => {
  await executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'momo', amount: 30000 }, newId);
  assert.equal(balance('wave'), 70000);
  assert.equal(balance('momo'), 30000);
  const tx = db.prepare("SELECT * FROM transactions").all();
  assert.equal(tx.length, 1);
  assert.equal(tx[0].type, 'TRANSFER');
  assert.equal(tx[0].destination_account_id, 'momo');
  assert.equal(tx[0].notes, 'Wave → MoMo');
});

test('le virement ne compte ni en dépense ni en revenu', async () => {
  await executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'momo', amount: 30000 }, newId);
  const stats = db.prepare("SELECT COUNT(*) n FROM transactions WHERE type IN ('EXPENSE','INCOME')").get();
  assert.equal(stats.n, 0);
});

test('frais : débités en plus, enregistrés comme dépense « Frais & commissions »', async () => {
  await executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'momo', amount: 30000, fees: 300 }, newId);
  assert.equal(balance('wave'), 69700);
  assert.equal(balance('momo'), 30000);
  const fee = db.prepare("SELECT * FROM transactions WHERE type = 'EXPENSE'").get();
  assert.equal(fee.amount, 300);
  assert.equal(fee.category_id, FEES_CATEGORY.id);
  assert.equal(db.prepare('SELECT name FROM categories WHERE id = ?').get(FEES_CATEGORY.id).name, 'Frais & commissions');
});

test('solde insuffisant (montant + frais) : rien ne bouge', async () => {
  await assert.rejects(
    executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'momo', amount: 100000, fees: 1 }, newId),
    (e) => e instanceof TransferError && /Solde insuffisant/.test(e.message)
  );
  assert.equal(balance('wave'), 100000);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM transactions').get().n, 0);
});

test('compte clôturé ou identique refusé', async () => {
  await assert.rejects(executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'old', amount: 10 }, newId), /clôturé/);
  await assert.rejects(executeTransfer(adapter(), { userId: 'u1', fromAccountId: 'wave', toAccountId: 'wave', amount: 10 }, newId), /différents/);
});

test('validation des montants', () => {
  const base = { fromAccountId: 'a', toAccountId: 'b' };
  assert.match(validateTransferInput({ ...base, amount: 0 }), /supérieur à 0/);
  assert.match(validateTransferInput({ ...base, amount: 10, fees: -1 }), /négatifs/);
  assert.equal(validateTransferInput({ ...base, amount: 10, fees: 0 }), null);
});
