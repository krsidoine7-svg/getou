/**
 * Store de l'agenda des échéances — GERETOU
 * Relie deadlineRepo (testé) à expo-sqlite et programme les rappels locaux.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, withTransaction } from '../services/db/database';
import {
  Deadline,
  DeadlineInput,
  SqlDb,
  deleteDeadline,
  getDeadline,
  listDeadlines,
  markDeadlinePaid,
  payDeadline,
  postponeDeadline,
  saveDeadline,
  setNotificationId,
} from '../services/agenda/deadlineRepo';
import { cancelDeadlineReminder, scheduleDeadlineReminder } from '../services/agenda/deadlineNotifications';

const newId = () => Crypto.randomUUID();

function adapt(db: SQLiteDatabase): SqlDb {
  return {
    all: (sql, p = []) => db.getAllAsync(sql, p as never[]),
    get: (sql, p = []) => db.getFirstAsync(sql, p as never[]),
    run: async (sql, p = []) => {
      await db.runAsync(sql, p as never[]);
    },
  };
}

async function sqlDb(): Promise<SqlDb> {
  return adapt(await getDatabase());
}

/** (Re)programme le rappel d'une échéance et mémorise l'identifiant de notification. */
async function reschedule(userId: string, id: string | null): Promise<void> {
  if (!id) return;
  const db = await sqlDb();
  const d = await getDeadline(db, userId, id);
  if (!d) return;
  await cancelDeadlineReminder(d.notification_id);
  const notificationId = await scheduleDeadlineReminder(d).catch(() => null);
  await setNotificationId(db, id, notificationId);
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface AgendaState {
  deadlines: Deadline[];
  isLoading: boolean;
  /** Échéance ouverte dans l'écran d'alerte / paiement. */
  focusId: string | null;
  setFocus: (id: string | null) => void;
  refresh: (userId: string) => Promise<void>;
  /** Les actions renvoient null si succès, sinon le message d'erreur. */
  save: (input: DeadlineInput, editingId?: string) => Promise<string | null>;
  pay: (userId: string, deadlineId: string, accountId: string) => Promise<string | null>;
  markPaid: (userId: string, deadlineId: string) => Promise<string | null>;
  postpone: (userId: string, deadlineId: string, days?: number) => Promise<string | null>;
  remove: (userId: string, deadlineId: string) => Promise<string | null>;
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  deadlines: [],
  isLoading: false,
  focusId: null,
  setFocus: (id) => set({ focusId: id }),

  refresh: async (userId) => {
    set({ isLoading: true });
    try {
      set({ deadlines: await listDeadlines(await sqlDb(), userId), isLoading: false });
    } catch (e) {
      console.error('[GERETOU] Lecture des échéances impossible', e);
      set({ isLoading: false });
    }
  },

  save: async (input, editingId) => {
    try {
      const id = await saveDeadline(await sqlDb(), input, newId, editingId);
      await reschedule(input.userId, id);
      await get().refresh(input.userId);
      return null;
    } catch (e) {
      return message(e);
    }
  },

  pay: async (userId, deadlineId, accountId) => {
    try {
      const before = get().deadlines.find((d) => d.id === deadlineId);
      const { nextId } = await withTransaction((db) => payDeadline(adapt(db), { userId, deadlineId, accountId }, newId));
      await cancelDeadlineReminder(before?.notification_id);
      await reschedule(userId, nextId);
      await get().refresh(userId);
      return null;
    } catch (e) {
      return message(e);
    }
  },

  markPaid: async (userId, deadlineId) => {
    try {
      const before = get().deadlines.find((d) => d.id === deadlineId);
      const { nextId } = await withTransaction((db) => markDeadlinePaid(adapt(db), userId, deadlineId, newId));
      await cancelDeadlineReminder(before?.notification_id);
      await reschedule(userId, nextId);
      await get().refresh(userId);
      return null;
    } catch (e) {
      return message(e);
    }
  },

  postpone: async (userId, deadlineId, days = 1) => {
    try {
      await postponeDeadline(await sqlDb(), userId, deadlineId, days);
      await reschedule(userId, deadlineId);
      await get().refresh(userId);
      return null;
    } catch (e) {
      return message(e);
    }
  },

  remove: async (userId, deadlineId) => {
    try {
      const before = get().deadlines.find((d) => d.id === deadlineId);
      await deleteDeadline(await sqlDb(), userId, deadlineId);
      await cancelDeadlineReminder(before?.notification_id);
      await get().refresh(userId);
      return null;
    } catch (e) {
      return message(e);
    }
  },
}));
