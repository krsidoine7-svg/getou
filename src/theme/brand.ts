/**
 * Couleurs des opérateurs (pastilles Wave, MoMo, Orange…) — GERETOU
 */

import type { AccountType } from '../types/database';
import { colors } from './tokens';

export const ACCOUNT_BRAND: Record<AccountType, { fg: string; bg: string; short: string }> = {
  WAVE: { fg: '#0B6E99', bg: colors.brands.waveBg, short: 'WAVE' },
  MOMO: { fg: '#8A6D00', bg: colors.brands.momoBg, short: 'MTN MoMo' },
  ORANGE: { fg: '#B45309', bg: colors.brands.orangeBg, short: 'OM' },
  CASH: { fg: colors.text.secondary, bg: colors.brands.cashBg, short: 'ESPÈCES' },
  BANK: { fg: colors.primary.DEFAULT, bg: colors.primary.subtle, short: 'BANQUE' },
  VAULT: { fg: colors.primary.DEFAULT, bg: colors.primary.subtle, short: 'COFFRE' },
};
