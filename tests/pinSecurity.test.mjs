/**
 * Tests de sécurité du code PIN — GERETOU
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  hashPinSecure, verifyPinSecure, isSecureHash, constantTimeEqual,
  legacyHashPin, parseLockout, registerFailure, lockDurationMs,
  remainingFreeAttempts, EMPTY_LOCKOUT, FREE_ATTEMPTS, PIN_HASH_ITERATIONS,
} from '../src/services/auth/pinSecurity.ts';

const PEPPER = 'a'.repeat(64);

test('le hash PBKDF2 vérifie le bon PIN et rejette un mauvais', async () => {
  const h = await hashPinSecure('1234', randomBytes(16), PEPPER);
  assert.ok(isSecureHash(h));
  assert.equal(await verifyPinSecure('1234', h, PEPPER), true);
  assert.equal(await verifyPinSecure('1235', h, PEPPER), false);
});

test('le hash ne contient ni le PIN ni le pepper', async () => {
  const h = await hashPinSecure('9876', randomBytes(16), PEPPER);
  assert.ok(!h.includes('9876'));
  assert.ok(!h.includes(PEPPER));
  const hex = Buffer.from('9876').toString('hex');
  assert.ok(!h.includes(hex));
});

test('un pepper différent invalide le hash (base volée inexploitable seule)', async () => {
  const h = await hashPinSecure('1234', randomBytes(16), PEPPER);
  assert.equal(await verifyPinSecure('1234', h, 'b'.repeat(64)), false);
});

test('deux hash du même PIN diffèrent (sel aléatoire)', async () => {
  const a = await hashPinSecure('1234', randomBytes(16), PEPPER);
  const b = await hashPinSecure('1234', randomBytes(16), PEPPER);
  assert.notEqual(a, b);
  assert.equal(a.split('$')[1], String(PIN_HASH_ITERATIONS));
});

test('un hash malformé est rejeté', async () => {
  assert.equal(await verifyPinSecure('1234', 'pbkdf2-sha256$abc$00$00', PEPPER), false);
  assert.equal(await verifyPinSecure('1234', 'n_importe_quoi', PEPPER), false);
});

test('ancien format reconnu comme non sécurisé (pour migration)', () => {
  const legacy = legacyHashPin('1234', 'salt_x');
  assert.ok(legacy.startsWith('sha256_'));
  assert.equal(isSecureHash(legacy), false);
});

test('constantTimeEqual', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abd'), false);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
});

test('blocage progressif : libre 5 essais puis 30 s, 1 min, 2 min…, max 1 h', () => {
  let s = EMPTY_LOCKOUT;
  for (let i = 1; i < FREE_ATTEMPTS; i++) {
    s = registerFailure(s, 1000);
    assert.equal(s.lockedUntil, 0);
    assert.equal(remainingFreeAttempts(s), FREE_ATTEMPTS - i);
  }
  s = registerFailure(s, 1000);
  assert.equal(s.lockedUntil, 1000 + 30_000);
  assert.equal(lockDurationMs(6), 60_000);
  assert.equal(lockDurationMs(7), 120_000);
  assert.equal(lockDurationMs(50), 3_600_000);
});

test('parseLockout lit l\'ancien compteur et ignore les valeurs corrompues', () => {
  assert.deepEqual(parseLockout(null), EMPTY_LOCKOUT);
  assert.deepEqual(parseLockout('3'), { failedCount: 3, lockedUntil: 0 });
  assert.deepEqual(parseLockout('{"failedCount":6,"lockedUntil":42}'), { failedCount: 6, lockedUntil: 42 });
  assert.deepEqual(parseLockout('???'), EMPTY_LOCKOUT);
});
