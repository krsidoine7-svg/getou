/**
 * Rappels locaux des échéances (sans serveur, fonctionnent hors connexion) — GERETOU
 * Non disponibles dans le navigateur : les fonctions y renvoient null sans erreur.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { reminderDate, dueLabel } from './deadlineCore';
import type { Deadline } from './deadlineRepo';
import { formatFCFA } from '../../theme/tokens';
import { getAlertPrefs } from '../storage/prefs';
import { maskAmounts } from '../alerts/alertCore';

const CHANNEL_ID = 'echeances';
export const NOTIFICATION_KIND = 'deadline';

export const notificationsSupported = Platform.OS !== 'web';

let initialised = false;

/** Affichage des notifications au premier plan + canal Android. À appeler une fois au démarrage. */
export async function initDeadlineNotifications(): Promise<void> {
  if (!notificationsSupported || initialised) return;
  initialised = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Échéances',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Programme le rappel d'une échéance. Renvoie l'identifiant de notification,
 * ou null si le moment du rappel est déjà passé, si la permission est refusée ou sur le web.
 */
export async function scheduleDeadlineReminder(d: Deadline): Promise<string | null> {
  if (!notificationsSupported || d.status !== 'PENDING') return null;
  const prefs = await getAlertPrefs();
  if (!prefs.deadlineReminders) return null;
  const when = reminderDate(d.due_date, d.remind_time, d.remind_days_before);
  if (when.getTime() <= Date.now()) return null;
  if (!(await ensurePermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Échéance ${dueLabel(d.due_date, when).toLowerCase()} : ${d.title}`,
      body: maskAmounts(`${formatFCFA(d.amount)} à régler${d.account_name ? ` (prévu sur ${d.account_name})` : ''}. Touchez pour régler ou reporter.`, prefs.hideAmounts),
      data: { kind: NOTIFICATION_KIND, deadlineId: d.id },
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
  });
}

export async function cancelDeadlineReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationsSupported || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Déjà déclenchée ou inexistante
  }
}

/** Appelle `onOpen(deadlineId)` quand l'utilisateur touche un rappel (y compris au lancement de l'app). */
export function listenDeadlineTaps(onOpen: (deadlineId: string) => void): () => void {
  if (!notificationsSupported) return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    const data = r?.notification.request.content.data as { kind?: string; deadlineId?: string } | undefined;
    if (data?.kind === NOTIFICATION_KIND && data.deadlineId) onOpen(data.deadlineId);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

/** Notification immédiate (alerte de budget, sauvegarde, test). Sans effet sur le web. */
export async function notifyNow(title: string, body: string, data: Record<string, unknown> = {}): Promise<boolean> {
  if (!notificationsSupported) return false;
  await initDeadlineNotifications();
  if (!(await ensurePermission())) return false;
  const prefs = await getAlertPrefs();
  await Notifications.scheduleNotificationAsync({
    content: { title: maskAmounts(title, prefs.hideAmounts), body: maskAmounts(body, prefs.hideAmounts), data },
    trigger: null,
  });
  return true;
}

/** État de l'autorisation des notifications sur le téléphone. */
export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!notificationsSupported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  return ensurePermission();
}
