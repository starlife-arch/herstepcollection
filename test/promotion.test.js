import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePromoDiscount, validatePromotion } from '../api/_lib/promotion.js';
import { applyPromoCode } from '../api/_lib/promotion-service.js';
import { createRequestHandler } from '../api/_lib/request-handler.js';
import { validateOrderPromotion } from '../api/_lib/order.js';

function promoDb(promo, usage = null) {
  const documents = new Map([['promoCodes/HERSTEP10', promo]]); if (usage) documents.set('promoCodeUsages/HERSTEP10_customer-1', usage);
  const ref = (path) => ({ path, id: path.split('/').at(-1) });
  const db = { collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; }, async runTransaction(work) { const transaction = { async get(reference) { const data = documents.get(reference.path); return { exists: Boolean(data), data: () => data }; }, update(reference, updates) { documents.set(reference.path, { ...documents.get(reference.path), ...updates }); }, set(reference, updates) { documents.set(reference.path, { ...documents.get(reference.path), ...updates }); } }; return work(transaction); } };
  return { db, documents };
}

const lines = [{ productId: 'product-1', categoryId: 'heels', lineTotal: 1000 }];
const activePromo = { name: 'Ten percent', active: true, startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31'), discountType: 'PERCENTAGE', discountValue: 10, productIds: [], categoryIds: [], minimumOrderValue: 0, maximumUsage: 2, perCustomerUsage: 1, usageCount: 0 };

test('returns specific date and activation reasons without weakening promo validation', async () => {
  assert.throws(() => calculatePromoDiscount({ ...activePromo, active:false }, lines, 1000, new Date('2026-06-01')), /inactive/);
  assert.throws(() => calculatePromoDiscount({ ...activePromo, startsAt:new Date('2026-07-01') }, lines, 1000, new Date('2026-06-01')), /not active yet/);
  assert.throws(() => calculatePromoDiscount({ ...activePromo, endsAt: new Date('2026-01-02') }, lines, 1000, new Date('2026-02-01')), /expired/);
  const { db } = promoDb({ ...activePromo, usageCount: 2 });
  await assert.rejects(() => db.runTransaction((transaction) => applyPromoCode({ transaction, db, code: 'HERSTEP10', customerId: 'customer-1', lines, subtotal: 1000 })), /usage limit/);
  const missing = promoDb(activePromo).db;
  await assert.rejects(() => missing.runTransaction((transaction) => applyPromoCode({ transaction, db: missing, code: 'MISSING', customerId: 'customer-1', lines, subtotal: 1000 })), /invalid/);
});

test('normalizes customer promo code casing and whitespace before its Firestore lookup', () => {
  assert.equal(validateOrderPromotion({ promoCode:'  save10  ' }), 'SAVE10');
  assert.equal(validateOrderPromotion({ promoCode:'save_10' }), 'SAVE_10');
});

test('calculates the trusted discount instead of accepting a client total and atomically records usage', async () => {
  const { db, documents } = promoDb(activePromo);
  const result = await db.runTransaction((transaction) => applyPromoCode({ transaction, db, code: 'HERSTEP10', customerId: 'customer-1', lines, subtotal: 1000, now: new Date('2026-06-01') }));
  assert.equal(result.discount, 100);
  assert.equal(documents.get('promoCodes/HERSTEP10').usageCount, 1);
  assert.equal(documents.get('promoCodeUsages/HERSTEP10_customer-1').usageCount, 1);
});

test('enforces the per-customer usage cap when repeated attempts race through the transaction', async () => {
  const { db } = promoDb(activePromo, { usageCount: 1 });
  await assert.rejects(() => db.runTransaction((transaction) => applyPromoCode({ transaction, db, code: 'HERSTEP10', customerId: 'customer-1', lines, subtotal: 1000, now: new Date('2026-06-01') })), /already used/);
});

test('validates promotion limits and never accepts malformed campaign data', () => {
  assert.throws(() => validatePromotion({ name: 'Bad', active: true, startsAt: '2026-02-01', endsAt: '2026-01-01', discountType: 'PERCENTAGE', discountValue: 10 }), /valid promotion/);
  const promo = validatePromotion({ name:'New code', active:true, startsAt:'2026-01-01T00:00:00.000Z', endsAt:'2026-12-31T00:00:00.000Z', discountType:'FIXED', discountValue:200, maximumUsage:null, perCustomerUsage:1, minimumOrderValue:0, productIds:[], categoryIds:[] });
  assert.equal(promo.active, true);
  assert.equal(promo.maximumUsage, null);
  assert.equal(promo.perCustomerUsage, 1);
  assert.equal(calculatePromoDiscount(promo, lines, 1000, new Date('2026-06-01')), 200);
});

test('does not permit a non-admin customer to approve a discount request', async () => {
  const response = { statusCode: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
  const denied = Object.assign(new Error('Administrator access is required.'), { statusCode: 403 });
  const handler = createRequestHandler({ requireUser: async () => ({ uid: 'customer-1' }), requireAdministrator: async () => { throw denied; } });
  await handler({ method: 'PATCH', body: { requestId: 'request-12345678', status: 'APPROVED' } }, response);
  assert.equal(response.statusCode, 403);
});
