/**
 * Tests unitaires analyticsCore — règles pures et calculs statistiques
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPeriodRange,
  computeAnalytics,
  generateFinancialDiagnostic,
} from '../src/services/analytics/analyticsCore.ts';

test('getPeriodRange : calculs des bornes temporelles', () => {
  const ref = new Date('2026-05-15T12:00:00');

  // 7D
  const range7D = getPeriodRange('7D', ref);
  assert.equal(range7D.startDate, '2026-05-09');
  assert.equal(range7D.endDate, '2026-05-15');

  // MONTH
  const rangeMonth = getPeriodRange('MONTH', ref);
  assert.equal(rangeMonth.startDate, '2026-05-01');
  assert.equal(rangeMonth.endDate, '2026-05-31');
  assert.match(rangeMonth.label, /Mai 2026/);

  // YEAR
  const rangeYear = getPeriodRange('YEAR', ref);
  assert.equal(rangeYear.startDate, '2026-01-01');
  assert.equal(rangeYear.endDate, '2026-12-31');
});

test('computeAnalytics : calculs totaux, taux d’épargne, répartition et timeline', () => {
  const ref = new Date('2026-05-07T12:00:00');
  const rows = [
    { amount: 300000, type: 'INCOME', category_id: 'cat_sal', date: '2026-05-02T10:00:00' },
    { amount: 50000, type: 'EXPENSE', category_id: 'cat_alim', category_name: 'Alimentation', category_color: '#10B981', date: '2026-05-02T12:00:00' },
    { amount: 25000, type: 'EXPENSE', category_id: 'cat_alim', category_name: 'Alimentation', category_color: '#10B981', date: '2026-05-03T15:00:00' },
    { amount: 25000, type: 'EXPENSE', category_id: 'cat_transp', category_name: 'Transport', category_color: '#3B82F6', date: '2026-05-04T08:00:00' },
  ];

  const summary = computeAnalytics(rows, '7D', ref);

  assert.equal(summary.incomeTotal, 300000);
  assert.equal(summary.expenseTotal, 100000);
  assert.equal(summary.netSavings, 200000);
  // Taux d'épargne : 200 000 / 300 000 = 67%
  assert.equal(summary.savingsRate, 67);

  // Catégories : Alimentation (75 000 = 75%), Transport (25 000 = 25%)
  assert.equal(summary.categories.length, 2);
  assert.equal(summary.categories[0].categoryName, 'Alimentation');
  assert.equal(summary.categories[0].amount, 75000);
  assert.equal(summary.categories[0].percentage, 75);

  assert.equal(summary.categories[1].categoryName, 'Transport');
  assert.equal(summary.categories[1].amount, 25000);
  assert.equal(summary.categories[1].percentage, 25);

  // Timeline contient 7 points
  assert.equal(summary.timeline.length, 7);
  // Dépenses du 2026-05-02 = 50 000
  const day2 = summary.timeline.find(p => p.date === '2026-05-02');
  assert.ok(day2);
  assert.equal(day2.amount, 50000);
});

test('generateFinancialDiagnostic : adaptation du ton selon la situation', () => {
  // Situation excellente
  const diag1 = generateFinancialDiagnostic({
    incomeTotal: 500000,
    expenseTotal: 250000,
    netSavings: 250000,
    savingsRate: 50,
    topExpenseCategory: { categoryName: 'Logement', percentage: 40 },
  });
  assert.equal(diag1.tone, 'excellent');
  assert.match(diag1.headline, /Excellente/i);

  // Situation déficitaire
  const diag2 = generateFinancialDiagnostic({
    incomeTotal: 100000,
    expenseTotal: 150000,
    netSavings: -50000,
    savingsRate: 0,
    topExpenseCategory: { categoryName: 'Loisirs', percentage: 60 },
  });
  assert.equal(diag2.tone, 'alert');
  assert.match(diag2.headline, /déficit/i);
});
