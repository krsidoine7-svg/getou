/**
 * Tests du moteur budgétaire — GERETOU (étape 6.1)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodRange, daysLeftInPeriod, budgetStatus, computeProgress, statusLabel, severity } from '../src/services/budget/budgetCalc.ts';

const now = new Date(2026, 10, 11, 15, 30); // 11 novembre 2026, 15 h 30 (heure locale)

test('bornes des périodes en heure locale', () => {
  const day = periodRange('DAY', now);
  assert.deepEqual([day.start, day.end], [new Date(2026, 10, 11), new Date(2026, 10, 12)]);
  const month = periodRange('MONTH', now);
  assert.deepEqual([month.start, month.end], [new Date(2026, 10, 1), new Date(2026, 11, 1)]);
  const dec = periodRange('MONTH', new Date(2026, 11, 31, 23, 0));
  assert.deepEqual(dec.end, new Date(2027, 0, 1), 'passage à l’année suivante');
});

test('jours restants, aujourd’hui inclus', () => {
  assert.equal(daysLeftInPeriod('MONTH', now), 20); // 11 → 30 novembre
  assert.equal(daysLeftInPeriod('DAY', now), 1);
  assert.equal(daysLeftInPeriod('MONTH', new Date(2026, 10, 30, 22, 0)), 1);
});

test('statut : vert, orange au seuil, imminent à 95 %, rouge à 100 %', () => {
  assert.equal(budgetStatus(40000, 50000, 0.85), 'healthy'); // 80 %
  assert.equal(budgetStatus(42500, 50000, 0.85), 'warning'); // 85 %
  assert.equal(budgetStatus(38000, 40000, 0.8), 'imminent'); // 95 %
  assert.equal(budgetStatus(20000, 20000, 0.8), 'over'); // 100 %
  assert.equal(budgetStatus(22000, 20000, 0.8), 'over');
});

test('progression : reste, pourcentage, conseil par jour', () => {
  const p = computeProgress({ period: 'MONTH', limit: 350000, alertThreshold: 0.8, spent: 238000 }, now);
  assert.equal(p.remaining, 112000);
  assert.equal(p.percent, 68);
  assert.equal(p.status, 'healthy');
  assert.equal(p.perDay, 5600); // 112 000 / 20 jours
});

test('dépassement : reste négatif, aucun montant conseillé', () => {
  const p = computeProgress({ period: 'MONTH', limit: 20000, alertThreshold: 0.8, spent: 22000 }, now);
  assert.equal(p.remaining, -2000);
  assert.equal(p.perDay, 0);
  assert.match(statusLabel(p, 0.8), /^Dépassé \(\+2 000 F\)$/);
});

test('libellés et ordre de gravité', () => {
  assert.equal(statusLabel({ status: 'warning', percent: 85, remaining: 7500 }, 0.85), 'Seuil critique (85 %)');
  assert.equal(statusLabel({ status: 'healthy', percent: 16, remaining: 25000 }, 0.8), 'Sain (16 %)');
  assert.equal(statusLabel({ status: 'healthy', percent: 56, remaining: 11000 }, 0.8), 'Sous contrôle');
  assert.ok(severity('over') > severity('imminent') && severity('imminent') > severity('warning') && severity('warning') > severity('healthy'));
});
