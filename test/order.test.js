import test from 'node:test';
import assert from 'node:assert/strict';
import { orderId, validateCart, validateCheckout } from '../api/_lib/order.js';

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
