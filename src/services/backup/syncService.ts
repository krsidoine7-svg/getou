/**
 * Service de sauvegarde / synchronisation Google Drive — GERETOU
 * Relie la base locale (expo-sqlite), le format de sauvegarde et le client Drive.
 */

import { getDatabase, withTransaction } from '../db/database';
import { BackupDb, BackupFile, exportDatabase, importDatabase, parseBackup } from './backupFormat';
import { DriveClient, DriveFileInfo } from './driveClient';
import { getJSON, setJSON } from '../storage/prefs';
import type { SQLiteDatabase } from 'expo-sqlite';

const LAST_SYNC_KEY = 'geretou_last_sync';

export interface SyncInfo {
  /** Date ISO de la dernière sauvegarde réussie depuis cet appareil. */
  syncedAt: string;
  /** Taille du fichier envoyé, en octets. */
  bytes: number;
  email: string;
}

function adapter(db: SQLiteDatabase): BackupDb {
  return {
    all: (sql, params = []) => db.getAllAsync(sql, params as never[]),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params as never[]);
    },
  };
}

export async function getLastSync(): Promise<SyncInfo | null> {
  return getJSON<SyncInfo>(LAST_SYNC_KEY);
}

/** Exporte la base et l'envoie sur Google Drive (remplace la sauvegarde précédente). */
export async function syncNow(accessToken: string, email: string): Promise<SyncInfo> {
  const db = await getDatabase();
  const backup = await exportDatabase(adapter(db));
  const content = JSON.stringify(backup);
  await new DriveClient(accessToken).upload(content);
  const info: SyncInfo = { syncedAt: backup.created_at, bytes: content.length, email };
  await setJSON(LAST_SYNC_KEY, info);
  return info;
}

/** Cherche et télécharge la sauvegarde du compte ; null si aucune. */
export async function fetchRemoteBackup(accessToken: string): Promise<{ file: DriveFileInfo; backup: BackupFile } | null> {
  const client = new DriveClient(accessToken);
  const file = await client.findBackup();
  if (!file) return null;
  return { file, backup: parseBackup(await client.download(file.id)) };
}

/**
 * Remplace les données locales par la sauvegarde, en une transaction (tout ou rien).
 * @param pinHash empreinte du PIN à attribuer à l'utilisateur restauré.
 */
export async function restoreBackup(backup: BackupFile, pinHash: string): Promise<void> {
  await withTransaction(async (db) => {
    await importDatabase(adapter(db), backup, pinHash);
  });
}
