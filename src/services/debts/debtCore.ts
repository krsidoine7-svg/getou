/**
 * Dettes & créances — règles pures (testables sous Node).
 * CREDIT = on vous doit (vous avez prêté) ; DEBT = vous devez (vous avez emprunté).
 */

export type DebtType = 'DEBT' | 'CREDIT';
export type DebtStatus = 'PENDING' | 'PARTIAL' | 'SETTLED' | 'DEFAULTED';

/** Provenance des mouvements d'argent liés aux dettes (transactions de type TRANSFER, hors budgets et bilans). */
export const DEBT_OUT = 'DEBT_OUT';
export const DEBT_IN = 'DEBT_IN';

export function statusAfter(remaining: number, initial: number): DebtStatus {
  if (remaining <= 0) return 'SETTLED';
  if (remaining < initial) return 'PARTIAL';
  return 'PENDING';
}

export function netBalance(items: { type: DebtType; remaining_amount: number; status: string }[]) {
  let owedToMe = 0;
  let iOwe = 0;
  for (const d of items) {
    if (d.status === 'SETTLED') continue;
    if (d.type === 'CREDIT') owedToMe += d.remaining_amount;
    else iOwe += d.remaining_amount;
  }
  return { owedToMe, iOwe, net: owedToMe - iOwe };
}

export function repaidRatio(initial: number, remaining: number): number {
  return initial > 0 ? Math.min(1, Math.max(0, (initial - remaining) / initial)) : 0;
}

/** Initiales pour l'avatar : « Moussa Koné » → « MK ». */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Numéro au format international sans « + » (pour wa.me).
 * Un numéro local ivoirien à 10 chiffres reçoit l'indicatif 225.
 * Renvoie null si le numéro est inutilisable.
 */
export function normalizePhone(raw: string | null | undefined, defaultCountry = '225'): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.length <= 10) digits = defaultCountry + digits;
  digits = digits.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

const fcfa = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;

export function reminderMessage(personName: string, remaining: number, dueDate: string | null): string {
  const first = personName.trim().split(/\s+/)[0] || personName;
  const due = dueDate
    ? ` prévu pour le ${new Date(dueDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
    : '';
  return `Bonjour ${first}, petit rappel amical pour le remboursement de ${fcfa(remaining)}${due}. Merci beaucoup !`;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function smsUrl(phone: string, message: string, ios = false): string {
  return `sms:+${phone}${ios ? '&' : '?'}body=${encodeURIComponent(message)}`;
}
