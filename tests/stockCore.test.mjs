/**
 * Tests unitaires stockCore — règles pures
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stockStatus,
  stepFor,
  roundQty,
  defaultTarget,
  effectiveTarget,
  neededQty,
  fillRatio,
  sortByCriticality,
  shoppingList,
  basketTotal,
  splitPayment,
  formatQty,
  parseQty,
  validateStock,
} from '../src/services/stocks/stockCore.ts';

test('stockStatus: calcul correct du statut', () => {
  assert.equal(stockStatus(0, 2), 'OUT');
  assert.equal(stockStatus(-1, 2), 'OUT');
  assert.equal(stockStatus(2, 2), 'LOW');
  assert.equal(stockStatus(1.5, 2), 'LOW');
  assert.equal(stockStatus(2.1, 2), 'OK');
  assert.equal(stockStatus(5, 2), 'OK');
});

test('stepFor et roundQty', () => {
  assert.equal(stepFor('kg'), 0.5);
  assert.equal(stepFor('L'), 0.5);
  assert.equal(stepFor('bouteille'), 1);
  assert.equal(stepFor('paquet'), 1);

  assert.equal(roundQty(1.26), 1.5);
  assert.equal(roundQty(1.1), 1.0);
  assert.equal(roundQty(2.74), 2.5);
  assert.equal(roundQty(2.8), 3.0);
});

test('target et neededQty', () => {
  const stockWithTarget = {
    id: 's1',
    name: 'Riz',
    category: 'FOOD',
    unit: 'kg',
    current_qty: 2,
    min_threshold: 5,
    target_qty: 25,
    estimated_unit_price: 600,
  };

  assert.equal(effectiveTarget(stockWithTarget), 25);
  assert.equal(neededQty(stockWithTarget), 23); // 25 - 2 = 23

  const stockWithoutTarget = {
    id: 's2',
    name: 'Huile',
    category: 'FOOD',
    unit: 'L',
    current_qty: 0,
    min_threshold: 2,
    target_qty: null,
    estimated_unit_price: 1300,
  };
  // defaultTarget(2) = 4
  assert.equal(effectiveTarget(stockWithoutTarget), 4);
  assert.equal(neededQty(stockWithoutTarget), 4);

  // Stock suffisant : neededQty = 0
  const stockOk = { ...stockWithTarget, current_qty: 10 };
  assert.equal(neededQty(stockOk), 0);
});

test('fillRatio', () => {
  const s = {
    id: 's1',
    name: 'Savon',
    category: 'HOUSEHOLD',
    unit: 'morceau',
    current_qty: 4,
    min_threshold: 2,
    target_qty: 8,
    estimated_unit_price: 350,
  };
  assert.equal(fillRatio(s), 0.5);
});

test('sortByCriticality et shoppingList', () => {
  const items = [
    { id: '1', name: 'Sucre', category: 'FOOD', unit: 'paquet', current_qty: 5, min_threshold: 2, target_qty: 10, estimated_unit_price: 900 },
    { id: '2', name: 'Huile', category: 'FOOD', unit: 'L', current_qty: 0, min_threshold: 2, target_qty: 5, estimated_unit_price: 1300 },
    { id: '3', name: 'Riz', category: 'FOOD', unit: 'kg', current_qty: 1, min_threshold: 5, target_qty: 20, estimated_unit_price: 600 },
  ];

  const sorted = sortByCriticality(items);
  assert.equal(sorted[0].name, 'Huile'); // OUT
  assert.equal(sorted[1].name, 'Riz');   // LOW
  assert.equal(sorted[2].name, 'Sucre'); // OK

  const list = shoppingList(items);
  assert.equal(list.length, 2);
  assert.equal(list[0].stock.name, 'Huile');
  assert.equal(list[0].qty, 5); // 5 - 0 = 5
  assert.equal(list[0].estimate, 6500); // 5 * 1300

  assert.equal(list[1].stock.name, 'Riz');
  assert.equal(list[1].qty, 19); // 20 - 1 = 19
  assert.equal(list[1].estimate, 11400); // 19 * 600

  assert.equal(basketTotal(list), 17900);
});

test('splitPayment: répartition comptable exacte', () => {
  const lines = [
    { category: 'FOOD', name: 'Riz 25kg', estimate: 14000 },
    { category: 'FOOD', name: 'Huile Dinor', estimate: 6000 },
    { category: 'HOUSEHOLD', name: 'Savon BF', estimate: 2000 },
  ];
  // Total estimé = 22 000 (FOOD: 20 000, HOUSEHOLD: 2 000)
  // Montant réel négocié = 20 000
  const splits = splitPayment(lines, 20000);
  const totalAllocated = splits.reduce((sum, s) => sum + s.amount, 0);
  assert.equal(totalAllocated, 20000);
  assert.equal(splits.length, 2);
  const food = splits.find(s => s.categoryId === 'cat_alim');
  const house = splits.find(s => s.categoryId === 'cat_maison');
  assert.ok(food && house);
  assert.equal(food.amount + house.amount, 20000);
  assert.ok(food.amount > house.amount);
});

test('formatQty et parseQty', () => {
  assert.equal(formatQty(1, 'kg'), '1 kg');
  assert.equal(formatQty(2.5, 'L'), '2,5 L');
  assert.equal(formatQty(1, 'boîte'), '1 boîte');
  assert.equal(formatQty(3, 'boîte'), '3 boîtes');
  assert.equal(formatQty(1, 'morceau'), '1 morceau');
  assert.equal(formatQty(4, 'morceau'), '4 morceaux');

  assert.equal(parseQty('2,5'), 2.5);
  assert.equal(parseQty('10'), 10);
  assert.ok(Number.isNaN(parseQty('abc')));
});

test('validateStock: validations strictes', () => {
  const valid = {
    name: 'Lait Bonnet Bleu',
    category: 'FOOD',
    unit: 'boîte',
    currentQty: 2,
    minThreshold: 4,
    targetQty: 10,
    unitPrice: 650,
  };
  assert.equal(validateStock(valid), null);

  assert.match(validateStock({ ...valid, name: ' ' }), /nom/i);
  assert.match(validateStock({ ...valid, category: 'UNKNOWN' }), /catégorie/i);
  assert.match(validateStock({ ...valid, unit: 'tonnes' }), /unité/i);
  assert.match(validateStock({ ...valid, currentQty: -1 }), /quantité/i);
  assert.match(validateStock({ ...valid, minThreshold: -1 }), /seuil/i);
  assert.match(validateStock({ ...valid, targetQty: 3 }), /supérieur/i); // targetQty (3) <= minThreshold (4)
});
