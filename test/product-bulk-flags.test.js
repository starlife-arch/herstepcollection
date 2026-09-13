import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('catalogue bulk actions reuse the existing product PATCH path for visibility flags', async () => {
  const admin = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
  assert.match(admin, /Select all on this page/);
  for (const action of ['Mark as Featured', 'Unmark Featured', 'Mark as New Arrival', 'Unmark New Arrival']) assert.match(admin, new RegExp(action));
  assert.match(admin, /for \(const id of selected\)/);
  assert.match(admin, /api\(`\/api\/products\/\$\{encodeURIComponent\(id\)\}`, \{ method:'PATCH'/);
  assert.match(admin, /\[field\]:value/);
});

test('sitewide product size controls and validation use the 30 through 45 catalogue range', async () => {
  const [admin, router, requests, product, order, requestService] = await Promise.all(['admin.js', 'router.js', 'requests.js', 'api/_lib/product.js', 'api/_lib/order.js', 'api/_lib/request-service.js'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  for (const source of [admin, router, requests, product, order, requestService]) {
    assert.match(source, /30/);
    assert.match(source, /45/);
  }
  assert.match(product, /between 30 and 45/);
  assert.match(order, /\^\(30\|31\|32\|33\|34\|35\|36\|37\|38\|39\|40\|41\|42\|43\|44\|45\)\$/);
});

test('entire catalogue selection includes best seller actions and uses validated product PATCH updates', async () => {
  const [admin, productsRoute] = await Promise.all(['admin.js', 'api/_lib/routes/products.js'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(admin, /Select all products \(entire catalogue\)/);
  assert.match(admin, /Mark as Best Seller/);
  assert.match(admin, /Unmark Best Seller/);
  assert.match(admin, /data-bulk-flag="bestseller:true"/);
  assert.match(productsRoute, /await adminDb\.collection\('products'\)\.orderBy\('createdAt', 'desc'\)\.get\(\)/);
});
