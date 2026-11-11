/**
 * Tests des règles de choix du code PIN — GERETOU (étape 2.2)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinWeakness } from '../src/services/auth/pinRules.ts';

test('accepte un code ordinaire', () => {
  for (const p of ['2741', '0583', '9031']) assert.equal(pinWeakness(p), null, p);
});

test('refuse longueur ou caractères invalides', () => {
  for (const p of ['', '123', '12345', '12a4']) assert.notEqual(pinWeakness(p), null, p);
});

test('refuse les chiffres identiques', () => {
  for (const p of ['0000', '1111', '9999']) assert.match(pinWeakness(p), /identiques/);
});

test('refuse les suites croissantes et décroissantes', () => {
  for (const p of ['1234', '0123', '6789', '4321', '9876']) assert.match(pinWeakness(p), /suites/);
});

test('refuse les codes très courants', () => {
  assert.match(pinWeakness('1212'), /courant/);
  assert.match(pinWeakness('2580'), /courant/);
});
