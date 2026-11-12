/**
 * Tests d'intégration stockRepo sur SQLite en mémoire — GERETOU
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, INITIAL_CATEGORIES } from '../src/services/db/schema.ts';
import {
  createStock,
  updateStock,
  adjustQuantity,
  deleteStock,
  listStocks,
  getStock,
  restockBasket,
  StockError,
} from '../src/services/stocks/stockRepo.ts';

let db, seq;
const adapter = () => ({
  all: async (sql, p = []) => db.prepare(sql).all(...p),
  get: async (sql, p = []) => db.prepare(sql).get(...p) ?? null,
  run: async (sql, p = []) => { db.prepare(sql).run(...p); },
});
const newId = () => `z${++seq}`;
const balance = (id) => db.prepare('SELECT balance FROM accounts WHERE id = ?').get(id).balance;

beforeEach(() => {
  seq = 0;
  db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  db.exec(`
    INSERT INTO users (id, email, pin_hash) VALUES ('u1', 'a@b.c', 'h');
    INSERT INTO accounts (id, user_id, name, type, balance) VALUES ('wave', 'u1', 'Wave', 'WAVE', 50000);
  `);
  for (const c of INITIAL_CATEGORIES) {
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, icon, color, type, is_default)
      VALUES (?, ?, ?, ?, ?, ?);
    `).run(c.id, c.name, c.icon, c.color, c.type, c.is_default);
  }
});

test('création, lecture, mise à jour et suppression de stock', async () => {
  const sId = await createStock(
    adapter(),
    'u1',
    {
      name: 'Riz Parfumé 25kg',
      category: 'FOOD',
      unit: 'sac',
      currentQty: 1,
      minThreshold: 1,
      targetQty: 2,
      unitPrice: 14500,
    },
    newId
  );

  let item = await getStock(adapter(), 'u1', sId);
  assert.ok(item);
  assert.equal(item.name, 'Riz Parfumé 25kg');
  assert.equal(item.current_qty, 1);
  assert.equal(item.estimated_unit_price, 14500);

  // Mise à jour
  await updateStock(adapter(), 'u1', sId, {
    name: 'Riz Parfumé Dinor 25kg',
    category: 'FOOD',
    unit: 'sac',
    currentQty: 0.5,
    minThreshold: 1,
    targetQty: 2,
    unitPrice: 15000,
  });

  item = await getStock(adapter(), 'u1', sId);
  assert.equal(item.name, 'Riz Parfumé Dinor 25kg');
  assert.equal(item.current_qty, 0.5);
  assert.equal(item.estimated_unit_price, 15000);

  // Suppression
  await deleteStock(adapter(), 'u1', sId);
  item = await getStock(adapter(), 'u1', sId);
  assert.equal(item, null);
});

test('adjustQuantity: stepper incrément et décrément avec plancher à zéro', async () => {
  const sId = await createStock(
    adapter(),
    'u1',
    {
      name: 'Huile Dinor 5L',
      category: 'FOOD',
      unit: 'L',
      currentQty: 2,
      minThreshold: 2,
      targetQty: 5,
      unitPrice: 6500,
    },
    newId
  );

  const res1 = await adjustQuantity(adapter(), 'u1', sId, 0.5);
  assert.equal(res1.newQty, 2.5);

  const res2 = await adjustQuantity(adapter(), 'u1', sId, -1.0);
  assert.equal(res2.newQty, 1.5);

  // Ne doit pas descendre en dessous de 0
  const res3 = await adjustQuantity(adapter(), 'u1', sId, -5);
  assert.equal(res3.newQty, 0);

  const item = await getStock(adapter(), 'u1', sId);
  assert.equal(item.current_qty, 0);
});

test('restockBasket: réapprovisionnement avec débit du compte et création de transaction', async () => {
  const sRiz = await createStock(
    adapter(),
    'u1',
    {
      name: 'Riz 25kg',
      category: 'FOOD',
      unit: 'sac',
      currentQty: 0,
      minThreshold: 1,
      targetQty: 2,
      unitPrice: 14000,
    },
    newId
  );

  const sSavon = await createStock(
    adapter(),
    'u1',
    {
      name: 'Savon BF',
      category: 'HOUSEHOLD',
      unit: 'morceau',
      currentQty: 1,
      minThreshold: 3,
      targetQty: 8,
      unitPrice: 350,
    },
    newId
  );

  assert.equal(balance('wave'), 50000);

  // Réapprovisionner 1 sac de riz et 7 morceaux de savon pour 16 000 FCFA
  const res = await restockBasket(
    adapter(),
    {
      userId: 'u1',
      accountId: 'wave',
      totalAmount: 16000,
      items: [
        { stockId: sRiz, boughtQty: 1, unitPrice: 14000 },
        { stockId: sSavon, boughtQty: 7, unitPrice: 350 },
      ],
    },
    newId
  );

  assert.equal(res.updatedStockCount, 2);
  assert.equal(res.transactionIds.length, 2); // 1 pour cat_alim, 1 pour cat_maison
  assert.equal(balance('wave'), 34000); // 50 000 - 16 000 = 34 000

  // Vérifier les stocks réincrémentés
  const itemRiz = await getStock(adapter(), 'u1', sRiz);
  assert.equal(itemRiz.current_qty, 1);
  assert.ok(itemRiz.last_restocked_at);

  const itemSavon = await getStock(adapter(), 'u1', sSavon);
  assert.equal(itemSavon.current_qty, 8);
  assert.ok(itemSavon.last_restocked_at);

  // Vérifier les transactions créées
  const txs = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all('u1');
  assert.equal(txs.length, 2);
  const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
  assert.equal(totalSpent, 16000);
});

test('restockBasket: solde insuffisant refusé avec erreur claire', async () => {
  const sRiz = await createStock(
    adapter(),
    'u1',
    {
      name: 'Riz 25kg',
      category: 'FOOD',
      unit: 'sac',
      currentQty: 0,
      minThreshold: 1,
      targetQty: 2,
      unitPrice: 14000,
    },
    newId
  );

  await assert.rejects(
    restockBasket(
      adapter(),
      {
        userId: 'u1',
        accountId: 'wave',
        totalAmount: 60000, // Supérieur aux 50 000 FCFA de solde
        items: [{ stockId: sRiz, boughtQty: 4 }],
      },
      newId
    ),
    /Solde insuffisant/
  );

  // Le solde Wave et le stock n'ont pas bougé
  assert.equal(balance('wave'), 50000);
  const item = await getStock(adapter(), 'u1', sRiz);
  assert.equal(item.current_qty, 0);
});
