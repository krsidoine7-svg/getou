/**
 * Tests des calculs du tableau de bord — GERETOU (étape 4.1)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupAccountsForCards, relativeDate, summarizeDebts } from '../src/services/dashboard/dashboardData.ts';

const acc = (id, type, sub_type, balance, is_archived = 0) => ({ id, type, sub_type, balance, is_archived, name: id });

test('les coffres et épargnes sont regroupés sous le compte principal du même opérateur', () => {
  const cards = groupAccountsForCards([
    acc('wave', 'WAVE', 'MAIN', 150000),
    acc('wave_coffre', 'WAVE', 'VAULT', 50000),
    acc('momo', 'MOMO', 'MAIN', 120000),
    acc('momo_ep', 'MOMO', 'SAVINGS', 80000),
    acc('cash', 'CASH', 'MAIN', 10000),
    acc('ancien', 'CASH', 'MAIN', 0, 1),
  ]);
  assert.deepEqual(cards.map((c) => [c.account.id, c.savings, c.savingsLabel]), [
    ['wave', 50000, 'Coffre'],
    ['momo', 80000, 'Épargne'],
    ['cash', 0, null],
  ]);
});

test('un coffre sans compte principal garde sa propre carte', () => {
  const cards = groupAccountsForCards([acc('coffre', 'VAULT', 'VAULT', 30000)]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].account.id, 'coffre');
});

test('dates relatives', () => {
  const now = new Date(2026, 10, 11, 15, 0);
  assert.equal(relativeDate(new Date(2026, 10, 11, 14, 59, 30).toISOString(), now), "À l'instant");
  assert.equal(relativeDate(new Date(2026, 10, 11, 14, 55).toISOString(), now), 'Il y a 5 min');
  assert.equal(relativeDate(new Date(2026, 10, 11, 13, 0).toISOString(), now), 'Il y a 2 h');
  assert.equal(relativeDate(new Date(2026, 10, 10, 18, 30).toISOString(), now), 'Hier, 18:30');
  assert.match(relativeDate(new Date(2026, 4, 24, 9, 0).toISOString(), now), /24 mai/);
});

test('créances et dettes ouvertes seulement', () => {
  assert.deepEqual(
    summarizeDebts([
      { type: 'CREDIT', remaining_amount: 45000, status: 'PENDING' },
      { type: 'DEBT', remaining_amount: 10000, status: 'PARTIAL' },
      { type: 'DEBT', remaining_amount: 5000, status: 'PENDING' },
      { type: 'DEBT', remaining_amount: 99999, status: 'SETTLED' },
    ]),
    { owedToMe: 45000, iOwe: 15000 }
  );
});

test('portefeuilles : chaque coffre / épargne listé sous son compte principal', async () => {
  const { groupAccountsWithChildren } = await import('../src/services/dashboard/dashboardData.ts');
  const groups = groupAccountsWithChildren([
    acc('wave', 'WAVE', 'MAIN', 150000),
    acc('c1', 'WAVE', 'VAULT', 50000),
    acc('c2', 'WAVE', 'SAVINGS', 10000),
    acc('coffre_seul', 'VAULT', 'VAULT', 30000),
    acc('archive', 'WAVE', 'VAULT', 0, 1),
  ]);
  assert.deepEqual(groups.map((g) => [g.account.id, g.children.map((c) => c.id)]), [
    ['wave', ['c1', 'c2']],
    ['coffre_seul', []],
  ]);
});
