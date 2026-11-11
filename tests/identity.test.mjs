/**
 * Tests du profil invité / compte Google rattaché — GERETOU
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeGuestEmail, isGuestEmail, realEmail, userLabel, greetingName } from '../src/services/auth/identity.ts';

test("l'adresse invité est interne et reconnue comme telle", () => {
  const e = makeGuestEmail('3f2a9c1e-7b4d-4e8a-9f00-123456789abc');
  assert.equal(e, 'invite-3f2a9c1e-7b4d-4e8a-9f00-123456789abc@invite.geretou.local');
  assert.equal(isGuestEmail(e), true);
  assert.equal(isGuestEmail('alex@gmail.com'), false);
  assert.equal(isGuestEmail(null), true);
});

test("une adresse invité n'est jamais affichée", () => {
  const guest = makeGuestEmail('abc');
  assert.equal(realEmail(guest), null);
  assert.equal(userLabel(null, guest), null);
  assert.equal(userLabel('', guest), null);
  assert.equal(greetingName(null, guest), '');
});

test('nom puis e-mail réel pour le libellé et la salutation', () => {
  assert.equal(userLabel('Famille Kouassi', 'k@gmail.com'), 'Famille Kouassi');
  assert.equal(userLabel(null, 'k@gmail.com'), 'k@gmail.com');
  assert.equal(greetingName('Alex Konan', 'x@gmail.com'), 'Alex');
  assert.equal(greetingName(null, 'alex.k@gmail.com'), 'alex.k');
});
