/**
 * Format de sauvegarde GERETOU — export / import complet de la base locale.
 * Module pur : fonctionne avec n'importe quel pilote SQLite via l'interface BackupDb
 * (expo-sqlite dans l'app, node:sqlite dans les tests).
 *
 * Règles :
 * - Le hash du code PIN n'est JAMAIS exporté : il dépend d'un secret propre au téléphone.
 *   À la restauration, l'utilisateur choisit un PIN pour le nouvel appareil.
 * - La file de synchronisation (sync_queue) n'est pas exportée (état technique local).
 * - L'import remplace intégralement les données ; l'appelant doit l'exécuter dans une transaction.
 */

export const BACKUP_FORMAT = 'geretou-backup';
export const BACKUP_VERSION = 1;

/** Ordre d'insertion compatible avec les clés étrangères (suppression : ordre inverse). */
export const BACKUP_TABLES = [
  'users',
  'categories',
  'accounts',
  'transactions',
  'deadlines',
  'budgets',
  'stocks',
  'grocery_items',
  'debts_credits',
  'projects',
  'attachments',
  'audit_log',
  'alerts',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];
type Row = Record<string, unknown>;

/** Colonnes jamais exportées, par table. */
const EXCLUDED_COLUMNS: Partial<Record<BackupTable, string[]>> = {
  users: ['pin_hash'],
  // Identifiant de notification propre au téléphone : reprogrammé après restauration.
  deadlines: ['notification_id'],
};

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  created_at: string;
  /** E-mail du propriétaire (contrôle de cohérence à la restauration). */
  owner_email: string | null;
  tables: Record<BackupTable, Row[]>;
}

export interface BackupDb {
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export class BackupError extends Error {}

export async function exportDatabase(db: BackupDb, now: Date = new Date()): Promise<BackupFile> {
  const tables = {} as Record<BackupTable, Row[]>;
  for (const table of BACKUP_TABLES) {
    const excluded = EXCLUDED_COLUMNS[table] ?? [];
    const rows = await db.all<Row>(`SELECT * FROM ${table};`);
    tables[table] = rows.map((row) => {
      const copy: Row = {};
      for (const [k, v] of Object.entries(row)) if (!excluded.includes(k)) copy[k] = v;
      return copy;
    });
  }
  const ownerEmail = (tables.users[0]?.email as string | undefined) ?? null;
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, created_at: now.toISOString(), owner_email: ownerEmail, tables };
}

/** Valide un contenu lu depuis le Drive. Lève BackupError si le fichier est inutilisable. */
export function parseBackup(raw: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BackupError('Fichier de sauvegarde illisible.');
  }
  const b = data as Partial<BackupFile>;
  if (b?.format !== BACKUP_FORMAT) throw new BackupError("Ce fichier n'est pas une sauvegarde GERETOU.");
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new BackupError("Sauvegarde créée par une version plus récente de l'application. Mettez GERETOU à jour.");
  }
  if (!b.tables || !Array.isArray(b.tables.users) || b.tables.users.length === 0) {
    throw new BackupError('Sauvegarde vide ou incomplète.');
  }
  for (const t of BACKUP_TABLES) if (!Array.isArray(b.tables[t])) b.tables[t] = [];
  return b as BackupFile;
}

/**
 * Remplace toutes les données locales par celles de la sauvegarde.
 * @param pinHash empreinte du PIN choisi sur cet appareil (affectée à l'utilisateur restauré).
 * @returns nombre de lignes importées par table.
 */
export async function importDatabase(
  db: BackupDb,
  backup: BackupFile,
  pinHash: string
): Promise<Record<BackupTable, number>> {
  for (const table of [...BACKUP_TABLES].reverse()) {
    await db.run(`DELETE FROM ${table};`);
  }

  const counts = {} as Record<BackupTable, number>;
  for (const table of BACKUP_TABLES) {
    const columns = new Set((await db.all<{ name: string }>(`PRAGMA table_info(${table});`)).map((c) => c.name));
    const rows = backup.tables[table] ?? [];
    for (const source of rows) {
      const row: Row = table === 'users' ? { ...source, pin_hash: pinHash } : source;
      // Seules les colonnes connues du schéma actuel sont insérées (sauvegardes d'anciennes versions).
      const keys = Object.keys(row).filter((k) => columns.has(k));
      const placeholders = keys.map(() => '?').join(', ');
      await db.run(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
        keys.map((k) => row[k] as unknown)
      );
    }
    counts[table] = rows.length;
  }
  return counts;
}

/** Résumé lisible d'une sauvegarde (écran de restauration). */
export function summarizeBackup(backup: BackupFile): { accounts: number; transactions: number; stocks: number; debts: number } {
  return {
    accounts: backup.tables.accounts.filter((a) => !a.is_archived).length,
    transactions: backup.tables.transactions.filter((t) => !t.is_deleted).length,
    stocks: backup.tables.stocks.length,
    debts: backup.tables.debts_credits.length,
  };
}
