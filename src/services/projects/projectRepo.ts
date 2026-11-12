/**
 * Projets d'achat & épargne dédiée — GERETOU
 * Module pur (SqlDb). Les écritures multiples doivent être faites dans une transaction par l'appelant.
 *
 * Règle : l'argent d'un projet est physiquement bloqué dans un coffre (compte VAULT / SAVINGS).
 * Alimenter = virement interne neutre vers le coffre ; retirer = virement inverse.
 */

import { executeTransfer } from '../account/transferCore.ts';
import type { ProjectPriority, ProjectStatus } from './projectCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  locked_amount: number;
  account_vault_id: string | null;
  target_date: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  vault_name?: string | null;
  vault_type?: string | null;
  vault_balance?: number | null;
}

export interface NewProject {
  userId: string;
  title: string;
  description?: string | null;
  targetAmount: number;
  targetDate?: string | null;
  priority: ProjectPriority;
  /** IDEA = planifié (pas encore commencé) ; ACTIVE = en cours. */
  status: 'IDEA' | 'ACTIVE';
  /** Coffre existant à utiliser… */
  vaultAccountId?: string | null;
  /** …ou création d'un coffre dédié pour cet opérateur (ex : WAVE). */
  newVaultType?: string | null;
}

export class ProjectError extends Error {}

export function validateNewProject(p: Pick<NewProject, 'title' | 'targetAmount' | 'targetDate'>): string | null {
  if (p.title.trim().length < 2) return 'Donnez un nom au projet.';
  if (!Number.isFinite(p.targetAmount) || p.targetAmount <= 0) return "Saisissez un objectif supérieur à 0 FCFA.";
  if (p.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(p.targetDate)) return 'Date invalide.';
  return null;
}

export async function createProject(db: SqlDb, p: NewProject, newId: () => string): Promise<string> {
  const invalid = validateNewProject(p);
  if (invalid) throw new ProjectError(invalid);
  const now = new Date().toISOString();
  let vaultId = p.vaultAccountId ?? null;
  if (!vaultId && p.newVaultType) {
    vaultId = `acc_vault_${newId()}`;
    await db.run(
      `INSERT INTO accounts (id, user_id, name, type, sub_type, balance, currency, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'VAULT', 0, 'FCFA', 0, ?, ?);`,
      [vaultId, p.userId, `Coffre ${p.title.trim()}`, p.newVaultType, now, now]
    );
  }
  if (!vaultId) throw new ProjectError("Choisissez le coffre où l'argent du projet sera bloqué.");
  const id = `prj_${newId()}`;
  await db.run(
    `INSERT INTO projects (id, user_id, title, description, target_amount, locked_amount, account_vault_id, target_date, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?);`,
    [id, p.userId, p.title.trim(), p.description?.trim() || null, Math.round(p.targetAmount), vaultId, p.targetDate || null, p.priority, p.status, now, now]
  );
  return id;
}

export async function listProjects(db: SqlDb, userId: string): Promise<ProjectRecord[]> {
  return db.all<ProjectRecord>(
    `SELECT p.*, a.name AS vault_name, a.type AS vault_type, a.balance AS vault_balance
     FROM projects p LEFT JOIN accounts a ON a.id = p.account_vault_id
     WHERE p.user_id = ? AND p.status != 'ABANDONED'
     ORDER BY CASE p.status WHEN 'ACTIVE' THEN 0 WHEN 'IDEA' THEN 1 ELSE 2 END,
              CASE p.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
              p.target_date IS NULL, p.target_date;`,
    [userId]
  );
}

async function requireProject(db: SqlDb, userId: string, id: string): Promise<ProjectRecord> {
  const p = await db.get<ProjectRecord>('SELECT * FROM projects WHERE id = ? AND user_id = ?;', [id, userId]);
  if (!p) throw new ProjectError('Projet introuvable.');
  if (!p.account_vault_id) throw new ProjectError("Ce projet n'est lié à aucun coffre.");
  return p;
}

/** Alimente le coffre du projet depuis un compte ; passe le projet en cours, ou atteint si l'objectif est rempli. */
export async function fundProject(
  db: SqlDb,
  p: { userId: string; projectId: string; fromAccountId: string; amount: number },
  newId: () => string
): Promise<{ locked: number; completed: boolean }> {
  const project = await requireProject(db, p.userId, p.projectId);
  if (project.status === 'COMPLETED') throw new ProjectError('Objectif déjà atteint.');
  await executeTransfer(
    db,
    { userId: p.userId, fromAccountId: p.fromAccountId, toAccountId: project.account_vault_id!, amount: p.amount, notes: `Épargne projet : ${project.title}` },
    newId
  );
  const locked = project.locked_amount + Math.round(p.amount);
  const completed = locked >= project.target_amount;
  await db.run('UPDATE projects SET locked_amount = ?, status = ?, updated_at = ? WHERE id = ?;', [
    locked,
    completed ? 'COMPLETED' : 'ACTIVE',
    new Date().toISOString(),
    project.id,
  ]);
  return { locked, completed };
}

/** Reprend de l'argent du coffre du projet vers un compte (dans la limite de ce qui a été épargné). */
export async function withdrawFromProject(
  db: SqlDb,
  p: { userId: string; projectId: string; toAccountId: string; amount: number },
  newId: () => string
): Promise<{ locked: number }> {
  const project = await requireProject(db, p.userId, p.projectId);
  const amount = Math.round(p.amount);
  if (amount > project.locked_amount) throw new ProjectError(`Vous ne pouvez retirer que ${project.locked_amount} FCFA épargnés pour ce projet.`);
  await executeTransfer(
    db,
    { userId: p.userId, fromAccountId: project.account_vault_id!, toAccountId: p.toAccountId, amount, notes: `Retrait projet : ${project.title}` },
    newId
  );
  const locked = project.locked_amount - amount;
  await db.run('UPDATE projects SET locked_amount = ?, status = ?, updated_at = ? WHERE id = ?;', [
    locked,
    locked >= project.target_amount ? 'COMPLETED' : 'ACTIVE',
    new Date().toISOString(),
    project.id,
  ]);
  return { locked };
}

/** Abandon : le projet disparaît de la liste, l'argent reste dans le coffre (à retirer au préalable si besoin). */
export async function abandonProject(db: SqlDb, userId: string, id: string): Promise<void> {
  await db.run("UPDATE projects SET status = 'ABANDONED', updated_at = ? WHERE id = ? AND user_id = ?;", [new Date().toISOString(), id, userId]);
}
