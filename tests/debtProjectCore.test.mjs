/**
 * Tests des règles dettes / créances et projets d'épargne — GERETOU (étape 9)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusAfter, netBalance, repaidRatio, initials, normalizePhone, reminderMessage, whatsappUrl, smsUrl } from '../src/services/debts/debtCore.ts';
import { progress, daysLeft, savingsAdvice, pickAdviceProject } from '../src/services/projects/projectCore.ts';

test('statut après remboursement', () => {
  assert.equal(statusAfter(30000, 30000), 'PENDING');
  assert.equal(statusAfter(20000, 30000), 'PARTIAL');
  assert.equal(statusAfter(0, 30000), 'SETTLED');
});

test('solde net : créances − dettes, soldées exclues', () => {
  assert.deepEqual(
    netBalance([
      { type: 'CREDIT', remaining_amount: 20000, status: 'PARTIAL' },
      { type: 'CREDIT', remaining_amount: 25000, status: 'PENDING' },
      { type: 'DEBT', remaining_amount: 15000, status: 'PARTIAL' },
      { type: 'DEBT', remaining_amount: 99999, status: 'SETTLED' },
    ]),
    { owedToMe: 45000, iOwe: 15000, net: 30000 }
  );
  assert.equal(Math.round(repaidRatio(30000, 20000) * 100), 33);
  assert.equal(initials('Moussa Koné'), 'MK');
  assert.equal(initials('aïcha'), 'A');
});

test('numéros : local ivoirien, international, invalide', () => {
  assert.equal(normalizePhone('07 00 00 00 00'), '2250700000000');
  assert.equal(normalizePhone('+225 07 08 09 10 11'), '2250708091011');
  assert.equal(normalizePhone('00221 77 123 45 67'), '221771234567');
  assert.equal(normalizePhone('12'), null);
  assert.equal(normalizePhone(''), null);
});

test('message de relance et liens WhatsApp / SMS', () => {
  const msg = reminderMessage('Moussa Koné', 20000, '2026-06-15');
  assert.match(msg, /^Bonjour Moussa, petit rappel amical pour le remboursement de 20 000 FCFA prévu pour le 15 juin\./);
  assert.ok(whatsappUrl('2250700000000', msg).startsWith('https://wa.me/2250700000000?text=Bonjour%20Moussa'));
  assert.equal(smsUrl('2250700000000', 'a b'), 'sms:+2250700000000?body=a%20b');
  assert.equal(smsUrl('2250700000000', 'a b', true), 'sms:+2250700000000&body=a%20b');
});

test('projets : progression, jours restants, conseil d’épargne hebdomadaire', () => {
  const now = new Date(2026, 4, 11); // 11 mai 2026
  assert.equal(Math.round(progress(300000, 450000) * 100), 67);
  assert.equal(daysLeft('2026-06-30', now), 50);
  const a = savingsAdvice(450000, 300000, '2026-06-30', now);
  assert.deepEqual(a, { remaining: 150000, weeks: 8, perWeek: 18800, perMonth: 75000 });
  assert.equal(savingsAdvice(450000, 450000, '2026-06-30', now), null, 'objectif atteint');
  assert.equal(savingsAdvice(450000, 0, null, now), null, 'sans date');
  assert.equal(savingsAdvice(450000, 0, '2026-05-01', now), null, 'date passée');
});

test('projet conseillé : en cours, le plus proche de son échéance', () => {
  const now = new Date(2026, 4, 11);
  const p = (id, status, date, locked = 0) => ({ id, status, target_amount: 100000, locked_amount: locked, target_date: date });
  const pick = pickAdviceProject([p('a', 'ACTIVE', '2026-08-15'), p('b', 'ACTIVE', '2026-06-30'), p('c', 'IDEA', '2026-05-20'), p('d', 'ACTIVE', '2026-05-30', 100000)], now);
  assert.equal(pick.project.id, 'b');
});
