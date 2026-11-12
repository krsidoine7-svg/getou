/**
 * Analyses & Statistiques financières — règles pures et calculs (testables sous Node).
 * Périodes : 7 jours, Ce mois, 3 mois, Année.
 * Calcul du bilan net, taux d'épargne, barres chronologiques, répartition par catégorie et diagnostic textuel.
 */

export type AnalyticsPeriod = '7D' | 'MONTH' | '3M' | 'YEAR';

export interface DateRange {
  startDate: string; // ISO format 'YYYY-MM-DD'
  endDate: string;   // ISO format 'YYYY-MM-DD'
  label: string;
}

export interface DailyPoint {
  date: string; // 'YYYY-MM-DD'
  label: string; // ex: 'Lun', '1 Mai'
  amount: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number; // 0 - 100
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  periodLabel: string;
  incomeTotal: number;
  expenseTotal: number;
  netSavings: number;
  savingsRate: number; // 0 - 100
  dailyAverage: number;
  topExpenseCategory: CategoryBreakdown | null;
  categories: CategoryBreakdown[];
  timeline: DailyPoint[];
}

export interface DiagnosticResult {
  headline: string;
  tone: 'excellent' | 'good' | 'warning' | 'alert';
  summaryText: string;
  actionableTip: string;
}

/** Formate une date en 'YYYY-MM-DD' locale */
export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/** Calcule l'intervalle de dates pour chaque période demandée */
export function getPeriodRange(period: AnalyticsPeriod, refDate: Date = new Date()): DateRange {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const todayStr = formatISODate(refDate);

  if (period === '7D') {
    const start = new Date(refDate);
    start.setDate(refDate.getDate() - 6);
    return {
      startDate: formatISODate(start),
      endDate: todayStr,
      label: '7 Derniers Jours',
    };
  }

  if (period === 'MONTH') {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return {
      startDate: formatISODate(start),
      endDate: formatISODate(end),
      label: `${MONTH_NAMES_FR[m]} ${y}`,
    };
  }

  if (period === '3M') {
    const start = new Date(y, m - 2, 1);
    const end = new Date(y, m + 1, 0);
    return {
      startDate: formatISODate(start),
      endDate: formatISODate(end),
      label: `3 Derniers Mois`,
    };
  }

  // YEAR
  return {
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
    label: `Année ${y}`,
  };
}

export interface RawTxRow {
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  category_id: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  date: string;
}

/**
 * Calcule l'ensemble des métriques d'analyse pour une période donnée.
 */
export function computeAnalytics(
  rows: RawTxRow[],
  period: AnalyticsPeriod,
  refDate: Date = new Date()
): AnalyticsSummary {
  const range = getPeriodRange(period, refDate);
  let incomeTotal = 0;
  let expenseTotal = 0;

  const categoryMap = new Map<
    string,
    { name: string; icon: string; color: string; amount: number }
  >();

  // Map des dépenses par jour dans l'intervalle
  const dailyMap = new Map<string, number>();

  for (const row of rows) {
    if (row.type === 'INCOME') {
      incomeTotal += row.amount;
    } else if (row.type === 'EXPENSE') {
      expenseTotal += row.amount;

      // Ventilation catégories
      const catId = row.category_id || 'other';
      const cur = categoryMap.get(catId) || {
        name: row.category_name || 'Autres dépenses',
        icon: row.category_icon || 'tag',
        color: row.category_color || '#64748B',
        amount: 0,
      };
      cur.amount += row.amount;
      categoryMap.set(catId, cur);

      // Chronologie
      const dayKey = row.date.substring(0, 10);
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + row.amount);
    }
  }

  // Taux d'épargne
  const netSavings = incomeTotal - expenseTotal;
  const savingsRate =
    incomeTotal > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / incomeTotal) * 100))) : 0;

  // Catégories avec pourcentages triées par montant décroissant
  const categories: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([id, c]) => ({
      categoryId: id,
      categoryName: c.name,
      icon: c.icon,
      color: c.color,
      amount: c.amount,
      percentage: expenseTotal > 0 ? Math.round((c.amount / expenseTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Construction de la chronologie (timeline)
  const timeline: DailyPoint[] = [];
  const startObj = new Date(range.startDate + 'T00:00:00');
  const endObj = new Date(range.endDate + 'T00:00:00');

  if (period === '7D' || period === 'MONTH') {
    // Par jour
    const cur = new Date(startObj);
    while (cur <= endObj) {
      const dayStr = formatISODate(cur);
      const dayName =
        period === '7D'
          ? cur.toLocaleDateString('fr-FR', { weekday: 'short' })
          : `${cur.getDate()} ${cur.toLocaleDateString('fr-FR', { month: 'short' })}`;
      timeline.push({
        date: dayStr,
        label: dayName,
        amount: dailyMap.get(dayStr) || 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    // 3M ou YEAR : groupement par mois
    const monthGroups = new Map<string, { label: string; amount: number }>();
    const cur = new Date(startObj);
    while (cur <= endObj) {
      const monthKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGroups.has(monthKey)) {
        monthGroups.set(monthKey, {
          label: cur.toLocaleDateString('fr-FR', { month: 'short' }),
          amount: 0,
        });
      }
      const dayStr = formatISODate(cur);
      const spent = dailyMap.get(dayStr) || 0;
      monthGroups.get(monthKey)!.amount += spent;
      cur.setDate(cur.getDate() + 1);
    }

    for (const [mKey, val] of monthGroups.entries()) {
      timeline.push({
        date: mKey,
        label: val.label,
        amount: val.amount,
      });
    }
  }

  // Moyenne journalière sur les jours révolus de la période
  const daysCount = Math.max(1, timeline.length);
  const dailyAverage = Math.round(expenseTotal / daysCount);

  return {
    period,
    periodLabel: range.label,
    incomeTotal,
    expenseTotal,
    netSavings,
    savingsRate,
    dailyAverage,
    topExpenseCategory: categories[0] || null,
    categories,
    timeline,
  };
}

/**
 * Diagnostic financier textuel intelligent généré 100% hors-ligne.
 */
export function generateFinancialDiagnostic(
  summary: AnalyticsSummary,
  budgetLimitMonthly?: number | null
): DiagnosticResult {
  const { netSavings, savingsRate, topExpenseCategory, incomeTotal, expenseTotal } = summary;

  // Cas 1 : Aucune donnée
  if (incomeTotal === 0 && expenseTotal === 0) {
    return {
      headline: 'Données en cours de collecte',
      tone: 'good',
      summaryText: 'Enregistrez vos premières dépenses et recettes pour débloquer votre bilan financier.',
      actionableTip: 'Conseil : Notez chaque achat du jour directement sur le grand-livre pour un suivi fidèle.',
    };
  }

  // Cas 2 : Déficit (Dépenses supérieures aux revenus)
  if (netSavings < 0) {
    const deficit = Math.abs(netSavings);
    return {
      headline: 'Attention au déficit financier',
      tone: 'alert',
      summaryText: `Vos dépenses de la période dépassent vos revenus de ${formatMoneyFCFA(deficit)}. Vos réserves liquides diminuent.`,
      actionableTip: topExpenseCategory
        ? `Conseil prioritaire : Le poste « ${topExpenseCategory.categoryName} » représente ${topExpenseCategory.percentage}% de vos sorties. Essayez de temporiser certains achats.`
        : 'Conseil : Réduisez les dépenses imprévues pour rétablir la balance.',
    };
  }

  // Cas 3 : Dépassement de budget si configuré
  if (budgetLimitMonthly && expenseTotal > budgetLimitMonthly) {
    const over = expenseTotal - budgetLimitMonthly;
    return {
      headline: 'Plafond mensuel dépassé',
      tone: 'warning',
      summaryText: `Vous avez dépassé votre budget mensuel de ${formatMoneyFCFA(over)}.`,
      actionableTip: 'Conseil : Reportez les achats non essentiels au mois prochain pour rééquilibrer vos comptes.',
    };
  }

  // Cas 4 : Excellent taux d'épargne (>= 30%)
  if (savingsRate >= 30) {
    return {
      headline: 'Excellente gestion financière !',
      tone: 'excellent',
      summaryText: `Bravo ! Vous conservez ${savingsRate}% de vos revenus en épargne nette (${formatMoneyFCFA(netSavings)}). Vos finances sont très saines.`,
      actionableTip: 'Conseil : Pensez à allouer une partie de cet excédent dans un Coffre de projet ou MoMo Épargne.',
    };
  }

  // Cas 5 : Gestion équilibrée (0% - 29%)
  return {
    headline: 'Bilan positif et équilibré',
    tone: 'good',
    summaryText: `Vos finances sont à l'équilibre avec une épargne conservée de ${formatMoneyFCFA(netSavings)} (${savingsRate}%).`,
    actionableTip: topExpenseCategory
      ? `Conseil : Votre première dépense reste « ${topExpenseCategory.categoryName} » (${topExpenseCategory.percentage}%). Un petit effort d'optimisation augmentera votre épargne.`
      : 'Conseil : Fixez un objectif d\'épargne dédié pour accélérer vos projets.',
  };
}

function formatMoneyFCFA(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}
