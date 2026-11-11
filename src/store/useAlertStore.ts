/**
 * Store du centre d'alertes — GERETOU
 * Relie alertRepo (testé) à expo-sqlite, envoie les notifications immédiates selon les réglages.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../services/db/database';
import { AlertPrefs, AlertRecord, DEFAULT_ALERT_PREFS } from '../services/alerts/alertCore';
import {
  SqlDb,
  listAlerts,
  markAllRead,
  markRead,
  purgeOldAlerts,
  recordBackupAlert,
  recordBudgetAlerts,
  resolveAlert,
  syncDeadlineAlerts,
  unreadCount,
} from '../services/alerts/alertRepo';
import { notifyNow } from '../services/agenda/deadlineNotifications';
import { getAlertPrefs, setAlertPrefs } from '../services/storage/prefs';

const newId = () => Crypto.randomUUID();

async function sqlDb(): Promise<SqlDb> {
  const db = await getDatabase();
  return {
    all: (sql, p = []) => db.getAllAsync(sql, p as never[]),
    get: (sql, p = []) => db.getFirstAsync(sql, p as never[]),
    run: async (sql, p = []) => {
      await db.runAsync(sql, p as never[]);
    },
  };
}

interface AlertState {
  alerts: AlertRecord[];
  unread: number;
  prefs: AlertPrefs;
  isLoading: boolean;
  /** Purge (90 j), génère les alertes d'échéance dues, recharge la liste et le compteur. */
  refresh: (userId: string) => Promise<void>;
  loadPrefs: () => Promise<void>;
  updatePrefs: (patch: Partial<AlertPrefs>) => Promise<AlertPrefs>;
  markRead: (userId: string, id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  resolve: (userId: string, id: string, resolution: string) => Promise<void>;
  /** À appeler après chaque dépense enregistrée. */
  afterExpense: (userId: string, amount: number, categoryId: string | null) => Promise<void>;
  /** À appeler après chaque sauvegarde Drive réussie. */
  afterBackup: (userId: string, email: string, bytes: number) => Promise<void>;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  unread: 0,
  prefs: DEFAULT_ALERT_PREFS,
  isLoading: false,

  refresh: async (userId) => {
    set({ isLoading: true });
    try {
      const db = await sqlDb();
      await purgeOldAlerts(db, userId);
      await syncDeadlineAlerts(db, userId, newId);
      set({ alerts: await listAlerts(db, userId), unread: await unreadCount(db, userId), isLoading: false });
    } catch (e) {
      console.error('[GERETOU] Lecture des alertes impossible', e);
      set({ isLoading: false });
    }
  },

  loadPrefs: async () => set({ prefs: await getAlertPrefs() }),

  updatePrefs: async (patch) => {
    const prefs = { ...get().prefs, ...patch };
    await setAlertPrefs(prefs);
    set({ prefs });
    return prefs;
  },

  markRead: async (userId, id) => {
    await markRead(await sqlDb(), userId, id);
    await get().refresh(userId);
  },

  markAllRead: async (userId) => {
    await markAllRead(await sqlDb(), userId);
    await get().refresh(userId);
  },

  resolve: async (userId, id, resolution) => {
    await resolveAlert(await sqlDb(), userId, id, resolution);
    await get().refresh(userId);
  },

  afterExpense: async (userId, amount, categoryId) => {
    try {
      const created = await recordBudgetAlerts(await sqlDb(), userId, amount, categoryId, newId);
      const prefs = await getAlertPrefs();
      for (const { alert, crossing } of created) {
        const wanted = crossing.level === 'over' ? prefs.budgetOver : prefs.budgetThreshold;
        if (wanted) await notifyNow(alert.title, alert.body, { kind: 'alert', alertId: alert.id }).catch(() => false);
      }
      if (created.length) await get().refresh(userId);
    } catch (e) {
      console.error('[GERETOU] Calcul des alertes de budget impossible', e);
    }
  },

  afterBackup: async (userId, email, bytes) => {
    try {
      const alert = await recordBackupAlert(await sqlDb(), userId, email, bytes, newId);
      if (alert && (await getAlertPrefs()).backupSuccess) await notifyNow(alert.title, alert.body).catch(() => false);
      await get().refresh(userId);
    } catch (e) {
      console.error('[GERETOU] Alerte de sauvegarde impossible', e);
    }
  },
}));
