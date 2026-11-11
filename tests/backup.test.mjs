/**
 * Tests du format de sauvegarde — GERETOU
 * Simule : téléphone A → fichier (Drive) → téléphone B, sur de vraies bases SQLite.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/services/db/schema.ts';
import {
  exportDatabase, importDatabase, parseBackup, summarizeBackup, BackupError, BACKUP_TABLES,
} from '../src/services/backup/backupFormat.ts';

function openDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  return db;
}

/** Adaptateur node:sqlite → interface BackupDb. */
const adapter = (db) => ({
  all: async (sql, params = []) => db.prepare(sql).all(...params),
  run: async (sql, params = []) => { db.prepare(sql).run(...params); },
});

function seedPhoneA(db) {
  db.exec(`
    INSERT INTO users (id, email, display_name, pin_hash, biometric_enabled) VALUES ('usr_1', 'alex@gmail.com', 'Alex Konan', 'pbkdf2-sha256$10000$aa$bb', 1);
    INSERT INTO categories (id, name, icon, color, type, is_default) VALUES ('cat_alim', 'Alimentation', 'shopping-cart', '#10B981', 'EXPENSE', 1);
    INSERT INTO categories (id, name, icon, color, type, is_default) VALUES ('cat_perso', 'Tontine', 'tag', '#111111', 'EXPENSE', 0);
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('acc_wave', 'usr_1', 'Wave', 'WAVE', 20000);
    INSERT INTO accounts (id, user_id, name, type, balance, is_archived) VALUES ('acc_old', 'usr_1', 'Ancien', 'CASH', 0, 1);
    INSERT INTO transactions (id, user_id, amount, account_id, category_id, type, date, notes)
      VALUES ('tx_1', 'usr_1', 5000, 'acc_wave', 'cat_perso', 'EXPENSE', '2026-11-11T10:00:00Z', 'Marché d''Adjamé');
    INSERT INTO stocks (id, user_id, name, category, current_qty, unit) VALUES ('stk_riz', 'usr_1', 'Riz', 'Céréales', 2, 'kg');
    INSERT INTO grocery_items (id, stock_id, needed_qty) VALUES ('gro_1', 'stk_riz', 5);
    INSERT INTO debts_credits (id, user_id, type, person_name, initial_amount, remaining_amount) VALUES ('debt_1', 'usr_1', 'CREDIT', 'Awa', 10000, 4000);
    INSERT INTO sync_queue (mutation_id, table_name, operation, record_id, payload, timestamp) VALUES ('m1', 'transactions', 'INSERT', 'tx_1', '{}', 1);
  `);
}

let phoneA, phoneB;
beforeEach(() => {
  phoneA = openDb();
  seedPhoneA(phoneA);
  phoneB = openDb();
  phoneB.exec(`INSERT INTO categories (id, name, icon, color, type, is_default) VALUES ('cat_alim', 'Alimentation', 'shopping-cart', '#10B981', 'EXPENSE', 1);`);
});

test("l'export contient toutes les données mais jamais le hash du PIN", async () => {
  const backup = await exportDatabase(adapter(phoneA), new Date('2026-11-11T12:00:00Z'));
  const json = JSON.stringify(backup);
  assert.equal(backup.owner_email, 'alex@gmail.com');
  assert.equal(backup.created_at, '2026-11-11T12:00:00.000Z');
  assert.ok(!json.includes('pbkdf2'), 'le hash du PIN ne doit pas sortir du téléphone');
  assert.ok(!('sync_queue' in backup.tables));
  assert.equal(backup.tables.transactions[0].notes, "Marché d'Adjamé");
  assert.deepEqual(summarizeBackup(backup), { accounts: 1, transactions: 1, stocks: 1, debts: 1 });
});

test('restauration complète sur un nouveau téléphone avec un nouveau PIN', async () => {
  const raw = JSON.stringify(await exportDatabase(adapter(phoneA)));
  const counts = await importDatabase(adapter(phoneB), parseBackup(raw), 'NEW_PIN_HASH');

  assert.equal(counts.transactions, 1);
  for (const t of BACKUP_TABLES.filter((t) => t !== 'users')) {
    assert.deepEqual(
      phoneB.prepare(`SELECT * FROM ${t} ORDER BY 1`).all(),
      phoneA.prepare(`SELECT * FROM ${t} ORDER BY 1`).all(),
      `table ${t} identique`
    );
  }
  const user = phoneB.prepare('SELECT * FROM users').get();
  assert.equal(user.display_name, 'Alex Konan');
  assert.equal(user.pin_hash, 'NEW_PIN_HASH');
  assert.equal(phoneB.prepare('SELECT balance FROM accounts WHERE id = ?').get('acc_wave').balance, 20000);
  assert.deepEqual(phoneB.prepare('PRAGMA foreign_key_check').all(), [], 'aucune clé étrangère cassée');
});

test('restaurer deux fois donne le même résultat (pas de doublons)', async () => {
  const backup = parseBackup(JSON.stringify(await exportDatabase(adapter(phoneA))));
  await importDatabase(adapter(phoneB), backup, 'H');
  await importDatabase(adapter(phoneB), backup, 'H');
  assert.equal(phoneB.prepare('SELECT COUNT(*) n FROM transactions').get().n, 1);
  assert.equal(phoneB.prepare('SELECT COUNT(*) n FROM categories').get().n, 2);
});

test('une colonne inconnue (ancienne/nouvelle version) est ignorée sans erreur', async () => {
  const backup = await exportDatabase(adapter(phoneA));
  backup.tables.accounts[0].colonne_future = 'x';
  await importDatabase(adapter(phoneB), parseBackup(JSON.stringify(backup)), 'H');
  assert.equal(phoneB.prepare('SELECT COUNT(*) n FROM accounts').get().n, 2);
});

test('les fichiers invalides sont refusés avec un message clair', () => {
  assert.throws(() => parseBackup('pas du json'), BackupError);
  assert.throws(() => parseBackup('{"format":"autre"}'), /pas une sauvegarde GERETOU/);
  assert.throws(() => parseBackup('{"format":"geretou-backup","version":99,"tables":{"users":[{}]}}'), /plus récente/);
  assert.throws(() => parseBackup('{"format":"geretou-backup","version":1,"tables":{"users":[]}}'), /vide/);
});
