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

  // Vérification et insertion des catégories par défaut
  const existingCategories = await db.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if (existingCategories && existingCategories[0]?.count === 0) {
    for (const cat of INITIAL_CATEGORIES) {
      await db.runAsync(
        `INSERT INTO categories (id, name, icon, color, type, is_default)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [cat.id, cat.name, cat.icon, cat.color, cat.type, cat.is_default]
      );
    }
  }
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
