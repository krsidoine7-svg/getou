/**
 * Coach Financier Ivoirien (Nouchi) — GERETOU
 * Conseils percutants, authentiques et motivants dans le pur parler ivoirien.
 * Module pur (testable sous Node).
 */

export const INCOME_COACH_QUOTES = [
  "Tu as eu le djaï ! Tu ne vas pas garder quoi ? Ou bien tu veux faire paiya inconscient là ?",
  "Ahuu épargne là-bas ! Faut tout bouffer et après venir pleurer dans mes oreilles !",
  "Tu as eu un djaï, tu n'entends plus rien dèh ! En tout cas je t'attends, viens sécuriser ça dans ton coffre !",
  "Le djaï est entré ! N'oublie pas tes projets en cours oh, réserve ta part dans le coffre d'abord !",
  "Djaï frais en poche ! Fais pas le malin oh, alimente tes coffres d'abord, le reste c'est pour le garba !",
  "L'argent est là ! Garde un peu pour demain, la fin du mois ne prévient pas quelqu'un !",
];

export const BUDGET_OVER_QUOTES = [
  "Héé le djaï est fini oh ! Tu as dépassé ton plafond là !",
  "Mollement mollement ! Le budget est gâté, tu as touché le rouge vif !",
  "Plafond explosé ! Arrête le paiya un peu, le mois n'est pas encore fini !",
  "Ahiii, tu as versé tout le budget par terre ! Il faut freiner un peu !",
];

export const BUDGET_WARNING_QUOTES = [
  "Attention, le djaï commence à chauffer ! Tu approches dangereusement de la limite !",
  "Calme les dépenses un peu mon ami, ton budget est presque calé !",
  "Tu es à deux doigts du rouge ! Regarde bien avant de valider les prochains paiements.",
];

export const STALE_PROJECT_QUOTES = [
  (title: string) => `Ton projet « ${title} » dort depuis dêh ! Même 500 ou 1 000 FCFA faut déposer dedans aujourd'hui !`,
  (title: string) => `Le projet « ${title} » attend son djaï ! Faut pas laisser ça calé au même endroit, fais un petit pas !`,
  (title: string) => `Tu as oublié « ${title} » ou bien ? Le temps court oh, mets un jeton dans le coffre !`,
];

export const SHOPPING_LIST_QUOTES = [
  (item?: string) => `Il y a des courses en attente au marché ! N'attends pas que tout soit sec avant de charger${item ? ` (${item})` : ''} !`,
  (item?: string) => `Attention, stock presque vide ! Organise ton djaï pour ravitailler${item ? ` (${item})` : ' la maison'} !`,
  (item?: string) => `Pense au marché et aux réapprovisionnements${item ? ` (${item})` : ''} ! Organise ton djaï pour ne pas être surpris !`,
];

/** Sélection aléatoire ou déterministe d'une citation */
export function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function pickIncomeCoachQuote(): string {
  return pickRandom(INCOME_COACH_QUOTES);
}

export function pickBudgetCoachQuote(level: 'warning' | 'over'): string {
  return pickRandom(level === 'over' ? BUDGET_OVER_QUOTES : BUDGET_WARNING_QUOTES);
}

export function pickStaleProjectCoachQuote(title: string): string {
  const quoteFn = pickRandom(STALE_PROJECT_QUOTES);
  return quoteFn(title);
}

export function pickShoppingCoachQuote(sampleItem?: string): string {
  const quoteFn = pickRandom(SHOPPING_LIST_QUOTES);
  return quoteFn(sampleItem);
}

/** Calcule la clé de dédoublonnage hebdomadaire (ex: 2026-W46) pour éviter de spammer */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
