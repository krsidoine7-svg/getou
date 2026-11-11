/**
 * Tests des libellés de transactions — GERETOU (étape 4.2)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTransaction, txKind } from '../src/services/transaction/labels.ts';

test('dépense sans motif : le nom de la catégorie, pas « Dépense courante »', () => {
  assert.deepEqual(describeTransaction({ type: 'EXPENSE', category_name: 'Transport & Carburant' }), {
    title: 'Transport & Carburant',
    kind: null,
  });
});

test('revenu : la provenance en français, jamais le code brut', () => {
  assert.equal(describeTransaction({ type: 'INCOME', provenance: 'LOAN' }).title, 'Crédit / Emprunt');
  assert.equal(describeTransaction({ type: 'INCOME', provenance: 'SALARY' }).title, 'Salaire');
});

test('avec motif : le motif en titre, la nature en sous-titre', () => {
  assert.deepEqual(describeTransaction({ type: 'EXPENSE', notes: "  Marché d'Adjamé ", category_name: 'Alimentation' }), {
    title: "Marché d'Adjamé",
    kind: 'Alimentation',
  });
});

test('repli sur le type quand rien d’autre n’est connu', () => {
  assert.equal(txKind({ type: 'EXPENSE' }), 'Dépense');
  assert.equal(txKind({ type: 'TRANSFER' }), 'Virement interne');
  assert.equal(txKind({ type: 'INCOME', provenance: 'INCONNU' }), 'Revenu');
});

test('tuiles de catégorie : nom court + précision, repli sur le nom complet', async () => {
  const { categoryDisplay } = await import('../src/services/transaction/labels.ts');
  assert.deepEqual(categoryDisplay({ id: 'cat_transp', name: 'Transport & Carburant' }), { short: 'Transport', hint: 'Carburant, taxi, gbaka' });
  assert.deepEqual(categoryDisplay({ id: 'cat_x', name: 'Tontine' }), { short: 'Tontine', hint: 'Catégorie personnalisée' });
});
