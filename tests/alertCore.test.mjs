/**
 * Tests de la logique des alertes — GERETOU (étape 8)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetCrossings, sectionOf, filterAlerts, needsAction, maskAmounts } from '../src/services/alerts/alertCore.ts';

const b = (over) => ({
  id: 'b1', category_id: 'cat_alim', category_name: 'Alimentation', period: 'MONTH', alert_threshold: 0.85,
  limit: 50000, spent: 0, periodStart: '2026-11-01', ...over,
});

test('franchissement du seuil : une alerte « warning »', () => {
  const [c] = budgetCrossings([b({ spent: 42500 })], 14200, 'cat_alim'); // 28 300 → 42 500 (85 %)
  assert.equal(c.level, 'warning');
  assert.equal(c.dedupeKey, 'budget:b1:2026-11-01:warning');
});

test('déjà au-dessus du seuil avant la dépense : pas de nouvelle alerte', () => {
  assert.equal(budgetCrossings([b({ spent: 46000 })], 1000, 'cat_alim').length, 0);
});

test('passage direct sous le seuil → au-delà de 100 % : seule l’alerte « over »', () => {
  const crossings = budgetCrossings([b({ spent: 52000 })], 30000, 'cat_alim');
  assert.deepEqual(crossings.map((c) => c.level), ['over']);
});

test('budget de catégorie ignoré pour une autre catégorie ; budget global toujours concerné', () => {
  const global = b({ id: 'g', category_id: null, limit: 100000, spent: 81000, alert_threshold: 0.8 });
  const crossings = budgetCrossings([b({ spent: 49000 }), global], 2000, 'cat_transp');
  assert.deepEqual(crossings.map((c) => c.budget.id), ['g']);
});

test('sections : aujourd’hui, cette semaine, plus ancien', () => {
  const now = new Date(2026, 10, 11, 15, 0);
  assert.equal(sectionOf(new Date(2026, 10, 11, 8, 0).toISOString(), now), 'today');
  assert.equal(sectionOf(new Date(2026, 10, 6, 8, 0).toISOString(), now), 'week');
  assert.equal(sectionOf(new Date(2026, 10, 1, 8, 0).toISOString(), now), 'older');
});

test('filtres : non lues, action requise, résolues', () => {
  const a = (id, over) => ({ id, kind: 'BUDGET', level: 'WARNING', read_at: null, resolved_at: null, ...over });
  const list = [a('1'), a('2', { read_at: 'x' }), a('3', { resolved_at: 'x', read_at: 'x' }), a('4', { kind: 'BACKUP', level: 'SUCCESS' })];
  assert.deepEqual(filterAlerts(list, 'ALL', 'UNREAD').map((x) => x.id), ['1', '4']);
  assert.deepEqual(filterAlerts(list, 'ALL', 'ACTION').map((x) => x.id), ['1', '2']);
  assert.deepEqual(filterAlerts(list, 'BUDGET', 'RESOLVED').map((x) => x.id), ['3']);
  assert.equal(needsAction(list[3]), false);
});

test('masquage des montants dans les notifications', () => {
  assert.equal(maskAmounts('Facture CIE : 28 000 FCFA à régler', true), 'Facture CIE : ••• à régler');
  assert.equal(maskAmounts('Manque 8 000 F', true), 'Manque •••');
  assert.equal(maskAmounts('28 000 FCFA', false), '28 000 FCFA');
});
