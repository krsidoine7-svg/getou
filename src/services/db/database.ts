/**
 * Service de Base de Données SQLite Embarquée — GERETOU
 * Singleton de connexion avec mode WAL, intégrité référentielle et migrations.
 */

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from './schema';

const DB_NAME = 'geretou_local.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // Initialisation du driver expo-sqlite (API async moderne)
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

  // Configuration des performances & sécurité ACID sur mobile natif
  if (Platform.OS !== 'web') {
    try {
      await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
      await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    } catch (e) {
      console.warn('Pragmas WAL ignorés sur ce runtime:', e);
    }
  }

  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();

  // Exécution du schéma des 12 tables
  await db.execAsync(SCHEMA_SQL);
  await runMigrations(db);

  // Catégories par défaut : ajoute celles qui manquent (nouvelles versions de l'app incluses)
  for (const cat of INITIAL_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.is_default]
    );
  }
}

/**
 * Migrations additives pour les bases créées avec une version antérieure du schéma.
 * Chaque migration vérifie d'abord si elle est nécessaire (idempotente).
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const userColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(users);');
  if (!userColumns.some((c) => c.name === 'display_name')) {
    await db.execAsync('ALTER TABLE users ADD COLUMN display_name TEXT;');
  }
  // Étape 10 (stocks) : niveau « plein » et date du dernier réapprovisionnement.
  const stockColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(stocks);');
  if (!stockColumns.some((c) => c.name === 'target_qty')) {
    await db.execAsync('ALTER TABLE stocks ADD COLUMN target_qty REAL;');
  }
  if (!stockColumns.some((c) => c.name === 'last_restocked_at')) {
    await db.execAsync('ALTER TABLE stocks ADD COLUMN last_restocked_at TEXT;');
  }
  // Étape 12 (corbeille) : horodatage de suppression douce
  const txColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(transactions);');
  if (!txColumns.some((c) => c.name === 'deleted_at')) {
    await db.execAsync('ALTER TABLE transactions ADD COLUMN deleted_at TEXT;');
  }
  // La tontine n'est plus proposée : anciennes échéances -> « Autre dépense »,
  // catégorie par défaut retirée si rien ne l'utilise (l'historique est conservé sinon).
  await db.execAsync(`
    UPDATE deadlines SET kind = 'OTHER' WHERE kind = 'TONTINE';
    DELETE FROM categories WHERE id = 'cat_tontine'
      AND NOT EXISTS (SELECT 1 FROM transactions WHERE category_id = 'cat_tontine')
      AND NOT EXISTS (SELECT 1 FROM budgets WHERE category_id = 'cat_tontine');
  `);
}

/**
 * Exécute une série d'opérations dans une transaction SQLite
 */
export async function withTransaction<T>(
  callback: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const result = await callback(db);
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}
