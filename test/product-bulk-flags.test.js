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
