import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('signed-in account trigger opens the customer workspace instead of a second account action', async () => {
  const app = await source('app.js');
  assert.match(app, /if \(auth\?\.currentUser\) \{ window\.location\.assign\('\/account'\); return; \}/);
  assert.match(app, /newsletter-form'\)\?\.addEventListener/);
});

test('customer workspace exposes order, payment, support, request, and sign-out actions', async () => {
  const dashboard = await source('dashboard.js');
  for (const label of ['Orders', 'Payments', 'Support tickets', 'Order requests', 'Continue shopping', 'Sign out']) assert.match(dashboard, new RegExp(label));
  assert.match(dashboard, /href="\/account\/requests"/);
  assert.match(dashboard, /href="\/account\/orders"/);
});

test('collection checkout stays server-authoritative and works without an optional delivery document', async () => {
  const [config, orderHandler] = await Promise.all([source('api/_lib/routes/checkout-config.js'), source('api/_lib/order-create-handler.js')]);
  assert.match(config, /collectionEnabled: true/);
  assert.match(config, /const deliveryEnabled = settings\.deliveryEnabled === true/);
  assert.match(orderHandler, /const settings = \{ deliveryEnabled, deliveryFee: deliveryEnabled \? configuredSettings\.deliveryFee : 0 \}/);
  assert.match(orderHandler, /delivery\.deliveryMethod === 'DELIVERY' && !deliveryEnabled/);
});

test('new product editor tolerates the absence of an inventory object', async () => {
  const admin = await source('admin.js');
  assert.match(admin, /product\?\.inventory \|\| \[\]/);
});

test('payment initiation sends only the server-accepted order identifier', async () => {
  const cart = await source('cart.js');
  assert.match(cart, /body:JSON\.stringify\(\{ orderDocumentId:body\.order\.id \}\)/);
  assert.doesNotMatch(cart, /orderDocumentId:body\.order\.id, phone/);
  assert.match(cart, /if \(!body\.order\?\.id\)/);
});
