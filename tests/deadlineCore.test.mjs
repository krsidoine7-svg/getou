/**
 * Tests du calendrier des échéances — GERETOU (étape 7)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths, nextDueDate, daysUntil, bucketOf, dueLabel, reminderDate, quickDates, recurrenceRule, weekDays,
} from '../src/services/agenda/deadlineCore.ts';

const now = new Date(2026, 4, 27, 10, 0); // mercredi 27 mai 2026

test('récurrences : semaine, mois, trimestre', () => {
  assert.equal(nextDueDate('2026-05-28', 'WEEKLY'), '2026-06-04');
  assert.equal(nextDueDate('2026-05-30', 'MONTHLY'), '2026-06-30');
  assert.equal(nextDueDate('2026-05-30', 'QUARTERLY'), '2026-08-30');
  assert.equal(nextDueDate('2026-05-30', 'NONE'), null);
});

test('fin de mois : 31 janvier → 28 février, puis retour au 31 en mars', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(nextDueDate('2026-02-28', 'MONTHLY', 31), '2026-03-31');
  assert.equal(addMonths('2026-11-30', 3), '2027-02-28');
});

test('jours restants et catégorie d’urgence', () => {
  assert.equal(daysUntil('2026-05-28', now), 1);
  assert.equal(daysUntil('2026-05-25', now), -2);
  assert.equal(bucketOf('2026-05-25', now), 'overdue');
  assert.equal(bucketOf('2026-05-29', now), 'urgent'); // sous 48 h
  assert.equal(bucketOf('2026-06-05', now), 'upcoming');
});

test('libellés de date', () => {
  assert.equal(dueLabel('2026-05-27', now), "Aujourd'hui");
  assert.match(dueLabel('2026-05-28', now), /^Demain, 28 mai/);
  assert.match(dueLabel('2026-05-29', now), /^Vendredi 29 mai/);
  assert.equal(dueLabel('2026-05-24', now), 'En retard de 3 jours');
});

test('rappel la veille à 09:00', () => {
  assert.deepEqual(reminderDate('2026-05-28', '09:00', 1), new Date(2026, 4, 27, 9, 0));
  assert.deepEqual(reminderDate('2026-05-28', '18:30', 0), new Date(2026, 4, 28, 18, 30));
});

test('raccourcis de date de la maquette', () => {
  assert.deepEqual(quickDates(now).map((q) => q.day), ['2026-05-28', '2026-05-30', '2026-05-31', '2026-06-05']);
  assert.equal(quickDates(new Date(2026, 4, 2)).at(-1).day, '2026-05-05');
});

test('règle de récurrence lisible et semaine du lundi au dimanche', () => {
  assert.equal(recurrenceRule('2026-05-30', 'MONTHLY'), 'Le 30 de chaque mois');
  assert.deepEqual(weekDays(now), ['2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31']);
});
