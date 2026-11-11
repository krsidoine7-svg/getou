/**
 * Tests du store de navigation — GERETOU (Étape 0.1 du plan Stitch)
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useNavStore } from '../src/store/useNavStore.ts';

const nav = () => useNavStore.getState();

beforeEach(() => nav().reset());

test('démarre sur le tableau de bord', () => {
  assert.equal(nav().current, 'DASHBOARD');
  assert.deepEqual(nav().history, []);
});

test('navigate empile puis goBack revient', () => {
  nav().navigate('NEW_EXPENSE');
  assert.equal(nav().current, 'NEW_EXPENSE');
  nav().goBack();
  assert.equal(nav().current, 'DASHBOARD');
  assert.deepEqual(nav().history, []);
});

test('replace ne modifie pas la pile', () => {
  nav().navigate('NEW_EXPENSE');
  nav().replace('NEW_INCOME');
  assert.equal(nav().current, 'NEW_INCOME');
  nav().goBack();
  assert.equal(nav().current, 'DASHBOARD');
});

test('naviguer vers l\'écran courant ne l\'empile pas deux fois', () => {
  nav().navigate('DASHBOARD');
  assert.deepEqual(nav().history, []);
});

test('goBack sur pile vide reste sur le tableau de bord', () => {
  nav().goBack();
  assert.equal(nav().current, 'DASHBOARD');
});

test('switchTab change de racine et vide la pile', async () => {
  nav().navigate('MORE');
  nav().navigate('DEBTS');
  nav().switchTab('WALLETS');
  assert.equal(nav().current, 'WALLETS');
  assert.deepEqual(nav().history, []);
});

test('un module ouvert depuis Plus revient sur Plus', () => {
  nav().switchTab('MORE');
  nav().navigate('SETTINGS');
  nav().goBack();
  assert.equal(nav().current, 'MORE');
});

test('isTabScreen distingue onglets et modules', async () => {
  const { isTabScreen } = await import('../src/store/useNavStore.ts');
  assert.equal(isTabScreen('STOCKS'), true);
  assert.equal(isTabScreen('TRASH'), false);
  assert.equal(isTabScreen('NEW_EXPENSE'), false);
});
