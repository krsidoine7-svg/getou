/**
 * Abstraction de stockage sécurisé (Plateforme Native : Android / iOS) — GERETOU
 * Utilise le trousseau matériel (Android Keystore / iOS Keychain) via expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';

export async function getItemAsync(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
