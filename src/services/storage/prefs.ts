/**
 * Préférences locales persistantes (non sensibles) — GERETOU
 * SecureStore sur mobile, localStorage sur le web.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AlertPrefs, DEFAULT_ALERT_PREFS } from '../alerts/alertCore';

const ONBOARDING_DONE_KEY = 'geretou_onboarding_done';

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Préférence non critique : en cas d'échec l'onboarding sera simplement réaffiché.
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignorer
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setItem(key, JSON.stringify(value));
}

export async function isOnboardingDone(): Promise<boolean> {
  return (await getItem(ONBOARDING_DONE_KEY)) === '1';
}

export async function markOnboardingDone(): Promise<void> {
  await setItem(ONBOARDING_DONE_KEY, '1');
}

// ── Réglages des notifications ─────────────────────────

const ALERT_PREFS_KEY = 'geretou_alert_prefs';

export async function getAlertPrefs(): Promise<AlertPrefs> {
  return { ...DEFAULT_ALERT_PREFS, ...((await getJSON<Partial<AlertPrefs>>(ALERT_PREFS_KEY)) ?? {}) };
}

export async function setAlertPrefs(prefs: AlertPrefs): Promise<void> {
  await setJSON(ALERT_PREFS_KEY, prefs);
}
