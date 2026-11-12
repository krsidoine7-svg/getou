/**
 * Stocks domestiques & liste de courses — règles pures (testables sous Node).
 *
 * Statut : quantité 0 → rupture ; quantité ≤ seuil minimum → stock bas ; sinon OK.
 * Liste de courses : tout produit en stock bas ou en rupture, quantité à acheter = niveau cible − quantité actuelle.
 */

export type StockCategory = 'FOOD' | 'HOUSEHOLD' | 'BABY' | 'OTHER';
export type StockStatus = 'OK' | 'LOW' | 'OUT';

export const STOCK_CATEGORIES: { key: StockCategory; label: string }[] = [
  { key: 'FOOD', label: 'Alimentation' },
  { key: 'HOUSEHOLD', label: 'Hygiène & Entretien' },
  { key: 'BABY', label: 'Bébé & Soins' },
  { key: 'OTHER', label: 'Autre' },
];

export const STOCK_UNITS = ['kg', 'L', 'paquet', 'boîte', 'sac', 'morceau', 'bouteille', 'unité'] as const;

/** Catégorie de dépense utilisée lors d'un réapprovisionnement (budgets). */
export const EXPENSE_CATEGORY_FOR: Record<StockCategory, string> = {
  FOOD: 'cat_alim',
  HOUSEHOLD: 'cat_maison',
  BABY: 'cat_maison',
  OTHER: 'cat_maison',
};

export const MAX_QTY = 100000;

export interface StockLike {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_qty: number;
  min_threshold: number;
  target_qty: number | null;
  estimated_unit_price: number | null;
}

export function asCategory(c: string): StockCategory {
  return (STOCK_CATEGORIES.some((x) => x.key === c) ? c : 'OTHER') as StockCategory;
}

export function categoryLabel(c: string): string {
  return STOCK_CATEGORIES.find((x) => x.key === c)?.label ?? 'Autre';
}

/** Pas du bouton − / + : 0,5 pour le kilo et le litre, 1 sinon. */
export function stepFor(unit: string): number {
  return unit === 'kg' || unit === 'L' ? 0.5 : 1;
}

/** Arrondi au demi (évite 0.30000000000000004 après plusieurs pas). */
export function roundQty(q: number): number {
  return Math.round(q * 2) / 2;
}

export function stockStatus(qty: number, min: number): StockStatus {
  if (qty <= 0) return 'OUT';
  if (qty <= min) return 'LOW';
  return 'OK';
}

/** Niveau cible proposé quand l'utilisateur n'en fixe pas : le double du seuil (au moins seuil + 1). */
export function defaultTarget(min: number): number {
  return Math.max(min * 2, min + 1);
}

/** Niveau à atteindre après les courses (toujours au-dessus du seuil). */
export function effectiveTarget(s: Pick<StockLike, 'min_threshold' | 'target_qty' | 'unit'>): number {
  const target = s.target_qty && s.target_qty > 0 ? s.target_qty : defaultTarget(s.min_threshold);
  return Math.max(target, s.min_threshold + stepFor(s.unit));
}

/** Quantité à acheter pour remonter au niveau cible (0 si le stock est suffisant). */
export function neededQty(s: StockLike): number {
  if (stockStatus(s.current_qty, s.min_threshold) === 'OK') return 0;
  return roundQty(Math.max(0, effectiveTarget(s) - Math.max(0, s.current_qty)));
}

/** Remplissage de la jauge (quantité / niveau cible). */
export function fillRatio(s: StockLike): number {
  const t = effectiveTarget(s);
  return t > 0 ? Math.max(0, Math.min(1, s.current_qty / t)) : 0;
}

const RANK: Record<StockStatus, number> = { OUT: 0, LOW: 1, OK: 2 };

/** Classement par criticité : ruptures, puis stocks bas, puis le reste ; ordre alphabétique ensuite. */
export function sortByCriticality<T extends StockLike>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      RANK[stockStatus(a.current_qty, a.min_threshold)] - RANK[stockStatus(b.current_qty, b.min_threshold)] ||
      a.name.localeCompare(b.name, 'fr')
  );
}

export interface ShoppingLine<T extends StockLike = StockLike> {
  stock: T;
  qty: number;
  /** Coût estimé (null si le prix unitaire est inconnu). */
  estimate: number | null;
}

export function lineEstimate(qty: number, unitPrice: number | null): number | null {
  return unitPrice && unitPrice > 0 ? Math.round(qty * unitPrice) : null;
}

/** Liste de courses automatique : uniquement les produits à réapprovisionner. */
export function shoppingList<T extends StockLike>(items: T[]): ShoppingLine<T>[] {
  return sortByCriticality(items)
    .filter((s) => stockStatus(s.current_qty, s.min_threshold) !== 'OK')
    .map((s) => {
      const qty = neededQty(s);
      return { stock: s, qty, estimate: lineEstimate(qty, s.estimated_unit_price) };
    });
}

export function basketTotal(lines: { estimate: number | null }[]): number {
  return lines.reduce((sum, l) => sum + (l.estimate ?? 0), 0);
}

export interface ExpenseSplit {
  categoryId: string;
  amount: number;
  names: string[];
}

/**
 * Répartit le montant réellement payé entre les catégories de dépense (Alimentation / Maison),
 * au prorata des coûts estimés (à parts égales par produit si aucun prix n'est connu).
 * La somme des montants est exactement égale au montant payé.
 */
export function splitPayment(
  lines: { category: string; name: string; estimate: number | null }[],
  paid: number
): ExpenseSplit[] {
  const total = Math.round(paid);
  if (lines.length === 0 || total <= 0) return [];
  const anyPrice = lines.some((l) => (l.estimate ?? 0) > 0);
  const groups = new Map<string, { weight: number; names: string[] }>();
  for (const l of lines) {
    const key = EXPENSE_CATEGORY_FOR[asCategory(l.category)];
    const g = groups.get(key) ?? { weight: 0, names: [] };
    g.weight += anyPrice ? Math.max(0, l.estimate ?? 0) : 1;
    g.names.push(l.name);
    groups.set(key, g);
  }
  const entries = [...groups.entries()].filter(([, g]) => g.weight > 0 || !anyPrice);
  const weightSum = entries.reduce((s, [, g]) => s + g.weight, 0);
  const result: ExpenseSplit[] = entries.map(([categoryId, g]) => ({
    categoryId,
    amount: Math.floor((total * g.weight) / weightSum),
    names: g.names,
  }));
  // Le reste de l'arrondi va au groupe le plus important.
  const rest = total - result.reduce((s, r) => s + r.amount, 0);
  const biggest = result.reduce((best, r, i) => (r.amount > result[best].amount ? i : best), 0);
  result[biggest].amount += rest;
  // Produits sans prix quand d'autres en ont : rattachés au groupe principal pour apparaître dans le libellé.
  if (anyPrice) {
    for (const l of lines) {
      if (!result.some((r) => r.names.includes(l.name))) result[biggest].names.push(l.name);
    }
  }
  return result.filter((r) => r.amount > 0);
}

/** « 2 kg », « 1,5 L », « 3 boîtes », « 4 morceaux ». */
export function formatQty(qty: number, unit: string): string {
  const n = Number.isInteger(qty) ? String(qty) : String(qty).replace('.', ',');
  if (qty <= 1 || ['kg', 'L'].includes(unit) || unit.endsWith('s') || unit.endsWith('x')) {
    return `${n} ${unit}`;
  }
  if (unit.endsWith('eau')) {
    return `${n} ${unit}x`;
  }
  return `${n} ${unit}s`;
}

/** Lit une quantité saisie (« 1,5 » ou « 1.5 »). Renvoie NaN si invalide. */
export function parseQty(raw: string): number {
  const t = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export interface StockInput {
  name: string;
  category: string;
  unit: string;
  currentQty: number;
  minThreshold: number;
  targetQty: number | null;
  unitPrice: number | null;
}

export function validateStock(s: StockInput): string | null {
  const name = s.name.trim();
  if (name.length < 2) return 'Indiquez le nom du produit.';
  if (name.length > 60) return 'Nom trop long (60 caractères maximum).';
  if (!STOCK_CATEGORIES.some((c) => c.key === s.category)) return 'Choisissez une catégorie.';
  if (!(STOCK_UNITS as readonly string[]).includes(s.unit)) return 'Choisissez une unité.';
  const qtyOk = (q: number) => Number.isFinite(q) && q >= 0 && q <= MAX_QTY;
  if (!qtyOk(s.currentQty)) return 'Quantité en stock invalide.';
  if (!qtyOk(s.minThreshold)) return 'Seuil minimum invalide.';
  if (s.targetQty !== null && (!qtyOk(s.targetQty) || s.targetQty <= s.minThreshold)) {
    return 'Le niveau « plein » doit être supérieur au seuil minimum.';
  }
  if (s.unitPrice !== null && (!Number.isFinite(s.unitPrice) || s.unitPrice < 0 || s.unitPrice > 100_000_000)) {
    return 'Prix unitaire invalide.';
  }
  return null;
}
