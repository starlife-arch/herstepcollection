import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFee, validateDelivery } from '../api/_lib/delivery.js';
import { readFile } from 'node:fs/promises';

test('delivery settings validate county rates and resolve zones server-side', () => {
  const settings = validateDelivery({ deliveryEnabled:true, deliveryRates:{ outsideJuja:100, kiambu:200, defaultCounty:500, counties:{ Nairobi:300 } } });
  assert.equal(deliveryFee(settings, 'Juja Town, near Posta'), 0);
  assert.equal(deliveryFee(settings, 'Thika, Kiambu County'), 200);
  assert.equal(deliveryFee(settings, 'Westlands, Nairobi County'), 300);
  assert.equal(deliveryFee(settings, 'Mombasa'), 500);
});

test('admin promo toggle uses only supported patch fields and checkout hides instructions for pickup', async () => {
  const [admin, cart] = await Promise.all([readFile(new URL('../admin.js', import.meta.url), 'utf8'), readFile(new URL('../cart.js', import.meta.url), 'utf8')]);
  assert.match(admin, /code:promo\.code, name:promo\.name, description:promo\.description/);
  assert.doesNotMatch(admin, /\{ \.\.\.promo, active:/);
  assert.match(admin, /startsAt:new Date\(form\.startsAt\.value\)\.toISOString\(\), endsAt:new Date\(form\.endsAt\.value\)\.toISOString\(\)/);
  assert.match(admin, /startsAt:promo\.startsAt, endsAt:promo\.endsAt/);
  assert.match(admin, /Discount percentage \(%\)/);
  assert.match(admin, /Discount amount \(KSh\)/);
  assert.match(admin, /Leave blank for unlimited uses/);
  assert.match(admin, /A KSh 1,000 order becomes/);
  assert.match(admin, /data-view="delivery"/);
  assert.match(admin, /const productNames = new Map/);
  assert.match(admin, /escapeHtml\(productName\(item\.productId\)\)/);
  assert.match(cart, /delivery-instructions/);
  assert.match(cart, /querySelector\('#delivery-instructions'\)\.hidden = !delivery/);
});
