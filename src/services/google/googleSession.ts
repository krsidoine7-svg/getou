/**
 * Session Google — GERETOU
 * Compte connecté + jeton d'accès Drive, conservés dans le stockage sécurisé
 * (SecureStore sur mobile, localStorage sur le web).
 */

import { getJSON, setJSON, removeItem } from '../storage/prefs';

const SESSION_KEY = 'geretou_google_session';
/** Marge de sécurité avant l'expiration réelle du jeton. */
const EXPIRY_MARGIN_MS = 60_000;

export interface GoogleSession {
  email: string;
  name: string | null;
  picture: string | null;
  accessToken: string;
  /** Timestamp (ms) d'expiration du jeton d'accès. */
  expiresAt: number;
}

export function isTokenValid(session: GoogleSession | null, now: number = Date.now()): boolean {
  return !!session && session.expiresAt - EXPIRY_MARGIN_MS > now;
}

export async function loadSession(): Promise<GoogleSession | null> {
  return getJSON<GoogleSession>(SESSION_KEY);
}

export async function saveSession(session: GoogleSession): Promise<void> {
  await setJSON(SESSION_KEY, session);
}

export async function clearSession(): Promise<void> {
  await removeItem(SESSION_KEY);
}

/** Récupère l'identité Google associée au jeton (e-mail, nom, photo). */
export async function fetchGoogleProfile(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ email: string; name: string | null; picture: string | null }> {
  const res = await fetchImpl('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Impossible de lire le profil Google (${res.status}).`);
  const data = (await res.json()) as { email?: string; name?: string; picture?: string };
  if (!data.email) throw new Error("Le compte Google n'a pas fourni d'adresse e-mail.");
  return { email: data.email, name: data.name ?? null, picture: data.picture ?? null };
}
