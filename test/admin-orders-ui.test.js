import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = () => readFile(new URL('../admin.js', import.meta.url), 'utf8');

test('admin orders constrain transitions once after initial table rows render without observing its own DOM mutations', async () => {
  const admin = await source();
  assert.doesNotMatch(admin, /MutationObserver/);
  assert.match(admin, /onInitialDraw:constrainOrderTransitions/);
  assert.match(admin, /draw\(\);\s*onInitialDraw\?\.\(\);/);
});

test('admin customer request and support views prefer server-provided customer identities', async () => {
  const admin = await source();
  const identity = 'customerName || request.customerEmail || request.customerId';
  assert.ok(admin.includes(identity));
  assert.match(admin, /ticket\.customerName \|\| ticket\.customerEmail \|\| 'Unknown customer'/);
  assert.equal((admin.match(/ticket\.customerName \|\| ticket\.customerEmail \|\| 'Unknown customer'/g) || []).length, 2);
});

test('duplicate product flow pre-fills a new product form and posts copied Cloudinary media', async () => {
  const admin = await source();
  assert.match(admin, /data-duplicate-product/);
  assert.match(admin, /showProductForm\([^\n]+\{ duplicate:true \}\)/);
  assert.match(admin, /data-source-images/);
  assert.match(admin, /form\.dataset\.sourceImages\) \{ const file = form\.image\.files\[0\]; images = file \? \[await uploadImage\(file, form\.name\.value\)\] : JSON\.parse\(form\.dataset\.sourceImages\)/);
});
