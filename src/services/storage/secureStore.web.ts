/**
 * Abstraction de stockage sécurisé (Plateforme Web / PWA) — GERETOU
 * Utilise localStorage dans l'environnement Web sécurisé du navigateur.
 * Isole expo-secure-store pour éviter les erreurs de résolution Metro sur le web.
 */

export async function getItemAsync(key: string): Promise<string | null> {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
