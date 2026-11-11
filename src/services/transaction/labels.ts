/**
 * Libellés lisibles des transactions — GERETOU
 * Module pur (testable sous Node).
 */

import type { IncomeProvenance, TransactionType } from '../../types/database';

export const PROVENANCE_LABELS: Record<IncomeProvenance, string> = {
  SALARY: 'Salaire',
  FREELANCE: 'Prestation / Freelance',
  SALE: 'Vente d’un bien',
  GIFT: 'Don / Cadeau',
  LOAN: 'Crédit / Emprunt',
  OTHER: 'Autre revenu',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  EXPENSE: 'Dépense',
  INCOME: 'Revenu',
  TRANSFER: 'Virement interne',
};

export interface TxLabelInput {
  type: TransactionType;
  notes?: string | null;
  category_name?: string | null;
  provenance?: IncomeProvenance | string | null;
}

/** Nature de la transaction : catégorie, sinon provenance, sinon type. */
export function txKind(tx: TxLabelInput): string {
  if (tx.category_name) return tx.category_name;
  if (tx.provenance && tx.provenance in PROVENANCE_LABELS) return PROVENANCE_LABELS[tx.provenance as IncomeProvenance];
  return TYPE_LABELS[tx.type] ?? 'Opération';
}

/**
 * Titre = motif saisi par l'utilisateur s'il existe, sinon la nature.
 * Sous-titre = la nature, seulement si le titre est le motif (pour ne pas la répéter).
 */
export function describeTransaction(tx: TxLabelInput): { title: string; kind: string | null } {
  const kind = txKind(tx);
  const notes = tx.notes?.trim();
  return notes ? { title: notes, kind } : { title: kind, kind: null };
}

/** Nom court + précision pour les tuiles de catégorie (maquette Stitch). */
const CATEGORY_DISPLAY: Record<string, { short: string; hint: string }> = {
  cat_alim: { short: 'Alimentation', hint: 'Marché, courses du foyer' },
  cat_transp: { short: 'Transport', hint: 'Carburant, taxi, gbaka' },
  cat_factures: { short: 'Factures', hint: 'Eau, électricité, internet' },
  cat_loyer: { short: 'Logement', hint: 'Loyer & charges' },
  cat_sante: { short: 'Santé', hint: 'Pharmacie, soins' },
  cat_loisirs: { short: 'Loisirs', hint: 'Famille & sorties' },
  cat_imprevus: { short: 'Imprévus', hint: 'Dépannage, urgences' },
  cat_frais: { short: 'Frais', hint: 'Commissions Wave, MoMo…' },
};

export function categoryDisplay(cat: { id: string; name: string }): { short: string; hint: string } {
  return CATEGORY_DISPLAY[cat.id] ?? { short: cat.name, hint: 'Catégorie personnalisée' };
}
