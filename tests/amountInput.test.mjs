/**
 * Tests de la saisie du montant — GERETOU (étape 4.1b)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountInput, formatAmountInput, MAX_AMOUNT } from '../src/components/transaction/amountFormat.ts';

test('saisie libre : seuls les chiffres comptent', () => {
  assert.equal(parseAmountInput('15 000'), 15000);
  assert.equal(parseAmountInput('15.000 FCFA'), 15000);
  assert.equal(parseAmountInput(''), 0);
  assert.equal(parseAmountInput('abc'), 0);
});

test('montant plafonné (9 chiffres)', () => {
  assert.equal(parseAmountInput('99999999999'), MAX_AMOUNT);
});

test('affichage avec séparateur de milliers', () => {
  assert.equal(formatAmountInput(15000), '15 000');
  assert.equal(formatAmountInput(250000), '250 000');
  assert.equal(formatAmountInput(1234567), '1 234 567');
  assert.equal(formatAmountInput(0), '');
});
