/**
 * Saisie et affichage d'un montant en FCFA — module pur (testable sous Node).
 */

export const MAX_AMOUNT = 999_999_999;

/** « 15 000 » → 15000 ; ignore tout ce qui n'est pas un chiffre ; plafonné. */
export function parseAmountInput(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 9);
  return Math.min(Number(digits || 0), MAX_AMOUNT);
}

/** 15000 → « 15 000 » (espace fine insécable entre les milliers). */
export function formatAmountInput(value: number): string {
  return value > 0 ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
}
