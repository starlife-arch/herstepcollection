import test from 'node:test';
import assert from 'node:assert/strict';
import { orderId, validateCart, validateCheckout } from '../api/_lib/order.js';
import { createOrderHandler } from '../api/_lib/order-create-handler.js';

test('validates checkout delivery data without accepting client totals', () => {
  assert.deepEqual(validateCheckout({ fullName: 'Amina Wanjiku', phone: '0799 021 089', deliveryMethod: 'COLLECTION' }), {
    fullName: 'Amina Wanjiku', phone: '+254799021089', deliveryMethod: 'COLLECTION', location: 'Juja Town, Jerry House, near Juja Posta, Outside Shop No. 12', instructions: null
  });
  assert.throws(() => validateCheckout({ fullName: 'A', phone: '0799021089', deliveryMethod: 'COLLECTION' }));
  assert.throws(() => validateCheckout({ fullName: 'Amina Wanjiku', phone: '0799021089', deliveryMethod: 'DELIVERY' }));
});

test('validates cart line identity, quantities, and safe limits', () => {
  assert.deepEqual(validateCart([{ productId: 'product-1', size: '38', quantity: 2 }]), [{ productId: 'product-1', size: '38', quantity: 2 }]);
  assert.throws(() => validateCart([{ productId: 'product-1', size: '38', quantity: 11 }]));
  assert.throws(() => validateCart([{ productId: 'product-1', size: '38', quantity: 1 }, { productId: 'product-1', size: '38', quantity: 1 }]));
});

test('creates fixed-width human-readable HerStep order IDs', () => {
  assert.equal(orderId(2026, 124), 'HS-2026-000124');
});

test('creates a promo-code order when the actual handler transaction enforces all reads before writes', async () => {
  const documents = new Map([
    ['settings/checkout', { deliveryFee: 100, collectionEnabled: true, deliveryEnabled: true }],
    ['products/product-12345678', { name: 'Sandal', sku: 'SAN-1', status: 'ACTIVE', price: 800, stockQuantity: 2, inventory: [{ size: '38', quantity: 2 }] }],
    ['orderCounters/2026', { sequence: 12 }],
    ['promoCodes/WELCOME10', { name: 'Welcome', active: true, startsAt: new Date('2020-01-01'), endsAt: new Date('2030-01-01'), maximumUsage: 20, usageCount: 0, perCustomerUsage: 1, minimumOrder: 0, discountType: 'PERCENTAGE', discountValue: 10, applicableProductIds: [], applicableCategoryIds: [] }]
  ]);
  let generated = 0; const ref = (path) => ({ path, id: path.split('/').at(-1) });
  const db = { collection(name) { return { doc(id) { return ref(`${name}/${id || `generated-${++generated}`}`); } }; }, async runTransaction(work) { let wrote = false; const tx = { async get(reference) { if (wrote) throw new Error('Firestore transaction read occurred after a write'); const data = documents.get(reference.path); return { exists: data !== undefined, id: reference.id, data: () => data }; }, set(reference, data, options) { wrote = true; documents.set(reference.path, options?.merge ? { ...documents.get(reference.path), ...data } : data); }, update(reference, data) { wrote = true; documents.set(reference.path, { ...documents.get(reference.path), ...data }); }, create(reference, data) { wrote = true; if (documents.has(reference.path)) throw new Error('duplicate'); documents.set(reference.path, data); } }; return work(tx); } };
  const handler = createOrderHandler({ db, requireAuthenticatedUser: async () => ({ uid: 'customer-1', email: 'customer@example.test', email_verified: true }) });
  const response = { setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', body: { cart: [{ productId: 'product-12345678', size: '38', quantity: 1 }], promoCode: 'WELCOME10', delivery: { fullName: 'Amina Wanjiku', phone: '0799021089', deliveryMethod: 'COLLECTION' } } }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.order.discount, 80);
  assert.equal(documents.get('promoCodeUsages/WELCOME10_customer-1').usageCount, 1);
});
