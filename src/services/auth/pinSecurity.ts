/**
 * Primitives de sécurité du code PIN — GERETOU
 * Module pur (aucun import React Native) pour être testable sous Node.
 *
 * - Hachage : PBKDF2-HMAC-SHA256, sel aléatoire par utilisateur, « pepper » secret
 *   conservé dans le SecureStore (Keychain / Keystore). Une copie volée de la base
 *   SQLite ne suffit donc pas à retrouver le PIN par force brute.
 * - Comparaison à temps constant.
 * - Blocage progressif après plusieurs échecs (pas de blocage définitif).
 */

import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export const PIN_HASH_PREFIX = 'pbkdf2-sha256';
// Valeur stockée dans chaque empreinte : on peut l'augmenter plus tard sans casser les PIN existants.
export const PIN_HASH_ITERATIONS = 10_000;
const KEY_LENGTH = 32;

export async function hashPinSecure(
  pin: string,
  salt: Uint8Array,
  pepper: string,
  iterations: number = PIN_HASH_ITERATIONS
): Promise<string> {
  const derived = await pbkdf2Async(sha256, utf8ToBytes(`${pepper}:${pin}`), salt, {
    c: iterations,
    dkLen: KEY_LENGTH,
  });
  return `${PIN_HASH_PREFIX}$${iterations}$${bytesToHex(salt)}$${bytesToHex(derived)}`;
}

export function isSecureHash(stored: string): boolean {
  return stored.startsWith(`${PIN_HASH_PREFIX}$`);
}

export async function verifyPinSecure(pin: string, stored: string, pepper: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== PIN_HASH_PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  const candidate = await hashPinSecure(pin, hexToBytes(parts[2]), pepper, iterations);
  return constantTimeEqual(candidate, stored);
}

export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Ancien format (« sha256_… ») : n'est conservé que pour vérifier une dernière fois
 * les PIN existants et les migrer vers PBKDF2 à la première connexion réussie.
 */
export function legacyHashPin(pin: string, salt: string): string {
  const message = `${salt}::${pin}::GERETOU_SECURE_V1`;
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) - hash) + message.charCodeAt(i);
    hash = hash & hash;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(8, '0');
  const buffer = Array.from(message).map((c) => c.charCodeAt(0).toString(16)).join('');
  return `sha256_${hexPart}_${buffer.slice(0, 32)}`;
}

// ---------------------------------------------------------------------------
// Blocage progressif
// ---------------------------------------------------------------------------

export const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 60 * 60 * 1000;

export interface LockoutState {
  failedCount: number;
  lockedUntil: number; // timestamp ms, 0 = pas de blocage
}

export const EMPTY_LOCKOUT: LockoutState = { failedCount: 0, lockedUntil: 0 };

export function parseLockout(raw: string | null): LockoutState {
  if (!raw) return EMPTY_LOCKOUT;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.failedCount === 'number' && typeof v?.lockedUntil === 'number') return v;
  } catch {
    // Ancien format : simple compteur numérique
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? { failedCount: n, lockedUntil: 0 } : EMPTY_LOCKOUT;
}

/** Durée de blocage après `failedCount` échecs : 30 s, 1 min, 2 min… plafonné à 1 h. */
export function lockDurationMs(failedCount: number): number {
  if (failedCount < FREE_ATTEMPTS) return 0;
  return Math.min(BASE_LOCK_MS * 2 ** (failedCount - FREE_ATTEMPTS), MAX_LOCK_MS);
}

export function registerFailure(state: LockoutState, now: number): LockoutState {
  const failedCount = state.failedCount + 1;
  const duration = lockDurationMs(failedCount);
  return { failedCount, lockedUntil: duration > 0 ? now + duration : 0 };
}

export function remainingFreeAttempts(state: LockoutState): number {
  return Math.max(0, FREE_ATTEMPTS - state.failedCount);
}
