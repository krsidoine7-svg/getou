/**
 * Dettes & créances : enregistrement et remboursements — GERETOU
 * Module pur (SqlDb). Les écritures multiples doivent être faites dans une transaction par l'appelant.
 *
 * Règle comptable : prêter, emprunter, rembourser ou encaisser n'est ni une dépense ni un revenu.
 * Les mouvements d'argent sont des transactions TRANSFER (provenance DEBT_OUT / DEBT_IN),
 * exclues des budgets et des bilans, mais visibles dans l'historique et dans les soldes.
 */

import { DEBT_IN, DEBT_OUT, statusAfter } from './debtCore.ts';
import type { DebtStatus, DebtType } from './debtCore.ts';

export interface SqlDb {
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export interface DebtRecord {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  phone_number: string | null;
  initial_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: DebtStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewDebt {
  userId: string;
  type: DebtType;
  personName: string;
  phone?: string | null;
  amount: number;
  dueDate?: string | null;
  notes?: string | null;
  /** Compte d'où sort (créance) ou sur lequel arrive (dette) l'argent ; null = engagement déjà existant, sans mouvement. */
  accountId: string | null;
}

export class DebtError extends Error {}

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  is_archived: number;
}

async function requireAccount(db: SqlDb, userId: string, accountId: string): Promise<AccountRow> {
  const a = await db.get<AccountRow>('SELECT id, name, balance, is_archived FROM accounts WHERE id = ? AND user_id = ?;', [accountId, userId]);
  if (!a || a.is_archived) throw new DebtError('Compte introuvable ou clôturé.');
  return a;
}

/** Mouvement d'argent neutre (ni dépense ni revenu). direction OUT = débit, IN = crédit. */
async function moveMoney(
  db: SqlDb,
  p: { userId: string; accountId: string; amount: number; direction: 'OUT' | 'IN'; notes: string },
  newId: () => string
): Promise<string> {
  const account = await requireAccount(db, p.userId, p.accountId);
  if (p.direction === 'OUT' && account.balance < p.amount) {
    throw new DebtError(`Solde insuffisant sur ${account.name} : il manque ${p.amount - account.balance} FCFA.`);
  }
  const now = new Date().toISOString();
  const sign = p.direction === 'OUT' ? -1 : 1;
  await db.run('UPDATE accounts SET balance = balance + ?, updated_at = ? WHERE id = ?;', [sign * p.amount, now, account.id]);
  const txId = `tx_debt_${newId()}`;
  await db.run(
    `INSERT INTO transactions (id, user_id, amount, account_id, destination_account_id, category_id, type, nature, urgency, provenance, date, notes, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, NULL, 'TRANSFER', 'REGULAR', 'NORMAL', ?, ?, ?, 0, ?, ?);`,
    [txId, p.userId, p.amount, account.id, p.direction === 'OUT' ? DEBT_OUT : DEBT_IN, now, p.notes, now, now]
  );
  return txId;
}

export function validateNewDebt(d: Pick<NewDebt, 'personName' | 'amount' | 'dueDate'>): string | null {
  if (d.personName.trim().length < 2) return 'Indiquez le nom de la personne.';
  if (!Number.isFinite(d.amount) || d.amount <= 0) return 'Saisissez un montant supérieur à 0 FCFA.';
  if (d.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) return 'Date invalide.';
  return null;
}

export async function createDebt(db: SqlDb, d: NewDebt, newId: () => string): Promise<string> {
  const invalid = validateNewDebt(d);
  if (invalid) throw new DebtError(invalid);
  const amount = Math.round(d.amount);
  const name = d.personName.trim();
  if (d.accountId) {
    await moveMoney(
      db,
      {
        userId: d.userId,
        accountId: d.accountId,
        amount,
        direction: d.type === 'CREDIT' ? 'OUT' : 'IN',
        notes: d.type === 'CREDIT' ? `Prêt à ${name}` : `Emprunt auprès de ${name}`,
      },
      newId
    );
  }
  const id = `debt_${newId()}`;
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO debts_credits (id, user_id, type, person_name, phone_number, initial_amount, remaining_amount, due_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?);`,
    [id, d.userId, d.type, name, d.phone?.trim() || null, amount, amount, d.dueDate || null, d.notes?.trim() || null, now, now]
  );
  return id;
}

export async function listDebts(db: SqlDb, userId: string): Promise<DebtRecord[]> {
  return db.all<DebtRecord>(
    `SELECT * FROM debts_credits WHERE user_id = ?
     ORDER BY CASE status WHEN 'SETTLED' THEN 1 ELSE 0 END, due_date IS NULL, due_date, created_at DESC;`,
    [userId]
  );
}

/**
 * Remboursement partiel ou total.
 * CREDIT : on encaisse (crédit du compte) ; DEBT : on verse (débit du compte).
 * accountId null = réglé en dehors des comptes suivis (aucun mouvement).
 */
export async function recordRepayment(
  db: SqlDb,
  p: { userId: string; debtId: string; amount: number; accountId: string | null },
  newId: () => string
): Promise<{ remaining: number; status: DebtStatus }> {
  const d = await db.get<DebtRecord>('SELECT * FROM debts_credits WHERE id = ? AND user_id = ?;', [p.debtId, p.userId]);
  if (!d) throw new DebtError('Engagement introuvable.');
  if (d.status === 'SETTLED') throw new DebtError('Cet engagement est déjà soldé.');
  const amount = Math.round(p.amount);
  if (!(amount > 0)) throw new DebtError('Saisissez un montant supérieur à 0 FCFA.');
  if (amount > d.remaining_amount) throw new DebtError(`Le montant dépasse le reste dû (${d.remaining_amount} FCFA).`);
  if (p.accountId) {
    await moveMoney(
      db,
      {
        userId: p.userId,
        accountId: p.accountId,
        amount,
        direction: d.type === 'CREDIT' ? 'IN' : 'OUT',
        notes: d.type === 'CREDIT' ? `Remboursement reçu de ${d.person_name}` : `Remboursement à ${d.person_name}`,
      },
      newId
    );
  }
  const remaining = d.remaining_amount - amount;
  const status = statusAfter(remaining, d.initial_amount);
  await db.run('UPDATE debts_credits SET remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?;', [remaining, status, new Date().toISOString(), d.id]);
  return { remaining, status };
}

/** Suppression autorisée seulement si aucun remboursement n'a été enregistré (erreur de saisie). */
export async function deleteDebt(db: SqlDb, userId: string, debtId: string): Promise<void> {
  const d = await db.get<DebtRecord>('SELECT * FROM debts_credits WHERE id = ? AND user_id = ?;', [debtId, userId]);
  if (!d) return;
  if (d.remaining_amount !== d.initial_amount) throw new DebtError('Impossible de supprimer : des remboursements ont déjà été enregistrés.');
  await db.run('DELETE FROM debts_credits WHERE id = ?;', [debtId]);
}
