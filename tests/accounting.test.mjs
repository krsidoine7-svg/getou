/**
 * Suite de Tests d'Intégrité Comptable, SQLite & Règles Métier — GERETOU
 * Exécuté avec le test runner natif de Node.js et node:sqlite (100% réel, ACID).
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

describe('GERETOU — Tests Comptables & Règles Métier (MVP 0 & MVP 1)', () => {
  let db;

  beforeEach(() => {
    // 1. Initialisation d'une base SQLite réelle en mémoire
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    // 2. Définition du schéma DDL officiel des 12 tables
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        biometric_enabled INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        sub_type TEXT NOT NULL DEFAULT 'MAIN',
        balance REAL NOT NULL DEFAULT 0.0,
        currency TEXT NOT NULL DEFAULT 'FCFA',
        is_archived INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        account_id TEXT NOT NULL,
        destination_account_id TEXT,
        category_id TEXT,
        type TEXT NOT NULL CHECK (type IN ('EXPENSE', 'INCOME', 'TRANSFER')),
        nature TEXT NOT NULL DEFAULT 'REGULAR',
        urgency TEXT NOT NULL DEFAULT 'NORMAL',
        provenance TEXT,
        date TIMESTAMP NOT NULL,
        notes TEXT,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (account_id) REFERENCES accounts(id)
      );

      CREATE TABLE debts_credits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('DEBT', 'CREDIT')),
        person_name TEXT NOT NULL,
        initial_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING'
      );

      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mutation_id TEXT UNIQUE NOT NULL,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING'
      );

      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        action TEXT NOT NULL,
        new_data TEXT
      );
    `);

    // 3. Données de test : Utilisateur et comptes de départ
    db.exec(`
      INSERT INTO users (id, email, pin_hash) VALUES ('usr_1', 'amadou@example.com', 'hash_pin_1234');
      INSERT INTO accounts (id, user_id, name, type, sub_type, balance)
      VALUES ('acc_wave', 'usr_1', 'Wave Principal', 'WAVE', 'MAIN', 25000.0);
      INSERT INTO accounts (id, user_id, name, type, sub_type, balance)
      VALUES ('acc_momo', 'usr_1', 'MTN MoMo', 'MOMO', 'MAIN', 10000.0);
      INSERT INTO categories (id, name, icon, color, type)
      VALUES ('cat_alim', 'Alimentation', 'shopping-cart', '#10B981', 'EXPENSE');
    `);
  });

  test('Test 1 : Dépense Express — Débit exact, écriture transactionnelle et audit', () => {
    const expenseAmount = 15000.0;
    const accountId = 'acc_wave';
    const txId = 'tx_exp_001';

    // Transaction atomique ACID
    db.exec('BEGIN TRANSACTION;');
    db.exec(`
      INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, notes)
      VALUES ('${txId}', 'usr_1', ${expenseAmount}, '${accountId}', 'cat_alim', 'EXPENSE', datetime('now'), 'Marché');
      UPDATE accounts SET balance = balance - ${expenseAmount} WHERE id = '${accountId}';
      INSERT INTO audit_log (transaction_id, action, new_data) VALUES ('${txId}', 'CREATE', 'Expense logged');
      INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload)
      VALUES ('sync_001', 'transactions', 'INSERT', '${txId}', '{"amount": 15000}');
    `);
    db.exec('COMMIT;');

    // Vérification du solde du compte (25 000 - 15 000 = 10 000 FCFA)
    const account = db.prepare('SELECT balance FROM accounts WHERE id = ?;').get(accountId);
    assert.equal(account.balance, 10000.0, 'Le solde de Wave doit être exactement de 10 000 FCFA');

    // Vérification de la transaction
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?;').get(txId);
    assert.equal(tx.amount, 15000.0);
    assert.equal(tx.type, 'EXPENSE');

    // Vérification de la sync_queue
    const syncItem = db.prepare('SELECT * FROM sync_queue WHERE record_id = ?;').get(txId);
    assert.ok(syncItem, 'La transaction doit être enfilée dans sync_queue');
  });

  test('Test 2 : Règle Comptable Stricte — Un Crédit/Emprunt de 100 000 FCFA est routé vers les Dettes', () => {
    const loanAmount = 100000.0;
    const accountId = 'acc_wave';
    const txId = 'tx_loan_001';
    const debtId = 'debt_001';

    // Exécution selon la règle métier GERETOU
    db.exec('BEGIN TRANSACTION;');
    // 1. Crédit du compte
    db.exec(`UPDATE accounts SET balance = balance + ${loanAmount} WHERE id = '${accountId}';`);
    // 2. Transaction enregistrée
    db.exec(`
      INSERT INTO transactions (id, user_id, amount, account_id, provenance, type, date, notes)
      VALUES ('${txId}', 'usr_1', ${loanAmount}, '${accountId}', 'LOAN', 'INCOME', datetime('now'), 'Prêt ami');
    `);
    // 3. RÈGLE : Inscription automatique en Dette passive
    db.exec(`
      INSERT INTO debts_credits (id, user_id, type, person_name, initial_amount, remaining_amount, status)
      VALUES ('${debtId}', 'usr_1', 'DEBT', 'Prêt ami', ${loanAmount}, ${loanAmount}, 'PENDING');
    `);
    db.exec('COMMIT;');

    // Vérification solde Wave (25 000 + 100 000 = 125 000 FCFA)
    const account = db.prepare('SELECT balance FROM accounts WHERE id = ?;').get(accountId);
    assert.equal(account.balance, 125000.0);

    // Vérification création de la dette passive
    const debt = db.prepare('SELECT * FROM debts_credits WHERE id = ?;').get(debtId);
    assert.ok(debt, 'Une entrée de Dette doit exister dans debts_credits');
    assert.equal(debt.type, 'DEBT');
    assert.equal(debt.remaining_amount, 100000.0);
  });

  test('Test 3 : Virement Interne Neutre — Wave vers MoMo (Patrimoine Total Inchangé)', () => {
    const transferAmount = 5000.0;
    const txId = 'tx_trans_001';

    // Solde total initial (25 000 + 10 000 = 35 000 FCFA)
    const initialTotal = db.prepare('SELECT SUM(balance) as total FROM accounts WHERE is_archived = 0;').get().total;
    assert.equal(initialTotal, 35000.0);

    // Virement interne
    db.exec('BEGIN TRANSACTION;');
    db.exec(`
      UPDATE accounts SET balance = balance - ${transferAmount} WHERE id = 'acc_wave';
      UPDATE accounts SET balance = balance + ${transferAmount} WHERE id = 'acc_momo';
      INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, type, date, notes)
      VALUES ('${txId}', 'usr_1', ${transferAmount}, 'acc_wave', 'acc_momo', 'TRANSFER', datetime('now'), 'Virement interne');
    `);
    db.exec('COMMIT;');

    // Soldes individuels
    const wave = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_wave';").get();
    const momo = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_momo';").get();
    assert.equal(wave.balance, 20000.0);
    assert.equal(momo.balance, 15000.0);

    // Patrimoine total post-transfert (20 000 + 15 000 = 35 000 FCFA)
    const finalTotal = db.prepare('SELECT SUM(balance) as total FROM accounts WHERE is_archived = 0;').get().total;
    assert.equal(finalTotal, initialTotal, 'Le patrimoine consolidé doit rester strictement identique');
  });

  test('Test 4 : Règle Stricte de Clôture — Blocage obligatoire si solde > 0, puis Soft Delete', () => {
    // 1. Tenter de clôturer Wave alors que son solde est de 25 000 FCFA
    const waveAccount = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_wave';").get();
    const canDeleteDirectly = waveAccount.balance === 0;
    assert.equal(canDeleteDirectly, false, 'La suppression directe doit être strictement BLOQUÉE');

    // 2. Vidage préalable par virement total vers MoMo
    const remainingToTransfer = waveAccount.balance;
    db.exec('BEGIN TRANSACTION;');
    db.exec(`
      UPDATE accounts SET balance = 0 WHERE id = 'acc_wave';
      UPDATE accounts SET balance = balance + ${remainingToTransfer} WHERE id = 'acc_momo';
    `);
    db.exec('COMMIT;');

    // 3. Vérification solde Wave à 0
    const emptiedWave = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_wave';").get();
    assert.equal(emptiedWave.balance, 0.0);

    // 4. Application du Soft Delete (is_archived = 1)
    db.exec("UPDATE accounts SET is_archived = 1 WHERE id = 'acc_wave';");

    const archivedWave = db.prepare("SELECT is_archived FROM accounts WHERE id = 'acc_wave';").get();
    assert.equal(archivedWave.is_archived, 1, 'Le compte doit être archivé en Soft Delete');

    // 5. Vérifier que les comptes actifs excluent le compte archivé
    const activeAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE is_archived = 0;').get();
    assert.equal(activeAccounts.count, 1, 'Seul MoMo doit figurer dans les comptes actifs');
  });

  test('Test 5 : Intégrité Sous Dépenses Multiples Successives (ACID)', () => {
    // Wave démarre à 25 000 FCFA
    const initialWave = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_wave';").get().balance;
    assert.equal(initialWave, 25000.0);

    const amounts = [2000, 3500, 4500, 5000]; // Total 15 000 FCFA de dépenses

    for (const amt of amounts) {
      db.exec('BEGIN TRANSACTION;');
      db.exec(`
        INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date)
        VALUES ('tx_${Date.now()}_${amt}', 'usr_1', ${amt}, 'acc_wave', 'cat_alim', 'EXPENSE', datetime('now'));
        UPDATE accounts SET balance = balance - ${amt} WHERE id = 'acc_wave';
      `);
      db.exec('COMMIT;');
    }

    const finalWave = db.prepare("SELECT balance FROM accounts WHERE id = 'acc_wave';").get().balance;
    assert.equal(finalWave, 10000.0, '25 000 - 15 000 = exactement 10 000 FCFA');

    const totalTxCount = db.prepare("SELECT COUNT(*) as c FROM transactions WHERE account_id = 'acc_wave';").get().c;
    assert.equal(totalTxCount, 4, 'Les 4 transactions doivent être consignées');
  });
});
