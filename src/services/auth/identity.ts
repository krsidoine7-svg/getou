/**
 * Identité de l'utilisateur — GERETOU
 * L'app s'utilise sans compte : le profil local reçoit une adresse « invité » interne
 * (la colonne users.email est obligatoire et unique). Elle est remplacée par l'adresse
 * Google dès que l'utilisateur connecte son compte pour synchroniser.
 * Module pur (testable sous Node).
 */

export const GUEST_EMAIL_DOMAIN = 'invite.geretou.local';

export function makeGuestEmail(id: string): string {
  return `invite-${id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36)}@${GUEST_EMAIL_DOMAIN}`;
}

export function isGuestEmail(email?: string | null): boolean {
  return !email || email.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`);
}

/** E-mail réel (compte Google rattaché), ou null pour un profil invité. */
export function realEmail(email?: string | null): string | null {
  return isGuestEmail(email) ? null : email!.trim();
}

/** Libellé à afficher : nom, sinon e-mail réel, sinon null. */
export function userLabel(displayName?: string | null, email?: string | null): string | null {
  return displayName?.trim() || realEmail(email);
}

/** Prénom pour la salutation : « Famille Kouassi » → « Famille » ; « alex.k@gmail.com » → « alex.k ». */
export function greetingName(displayName?: string | null, email?: string | null): string {
  const name = displayName?.trim();
  if (name) return name.split(/\s+/)[0];
  return realEmail(email)?.split('@')[0] ?? '';
}
