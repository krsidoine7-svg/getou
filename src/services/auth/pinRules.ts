/**
 * Règles de choix du code PIN — GERETOU
 * Module pur (testable sous Node).
 */

export const PIN_LENGTH = 4;

/**
 * Renvoie la raison pour laquelle le PIN est refusé, ou null s'il est acceptable.
 * Refuse : longueur incorrecte, non numérique, chiffres tous identiques (0000),
 * suites croissantes ou décroissantes (1234, 9876), et quelques codes très courants.
 */
export function pinWeakness(pin: string): string | null {
  if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
    return `Le code doit comporter ${PIN_LENGTH} chiffres.`;
  }
  if (/^(\d)\1+$/.test(pin)) {
    return 'Évitez les chiffres tous identiques (ex : 0000).';
  }
  const digits = pin.split('').map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) {
    return 'Évitez les suites de chiffres (ex : 1234, 4321).';
  }
  if (COMMON_PINS.has(pin)) {
    return 'Ce code est trop courant, choisissez-en un autre.';
  }
  return null;
}

export const validatePin = pinWeakness;

const COMMON_PINS = new Set(['1212', '6969', '1004', '2000', '2580', '0852', '1122', '1313', '4545', '1010']);
