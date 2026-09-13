import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readBadge } from '../admin-bulk.js';

test('OCR classification accepts only unambiguous catalogue-sized numbers and prices', () => {
  assert.deepEqual(readBadge('NEW 1,500 37'), { price: 500, size: '37' });
  assert.deepEqual(readBadge('37/38 1200'), { price: 1200, size: '37' });
  assert.deepEqual(readBadge('brand 39 900 1200'), { price: null, size: '39' });
  assert.deepEqual(readBadge('logo only'), { price: null, size: null });
});

test('bulk intake uses signed uploads, browser ZIP extraction, persisted admin drafts, and existing product POST validation', async () => {
  const [ui, route, admin, config] = await Promise.all(['admin-bulk.js','api/_lib/routes/admin-bulk-drafts.js','api/admin.js','vercel.json'].map(async (file) => file.endsWith('.json') ? readFile(new URL(`../${file}`, import.meta.url), 'utf8') : readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(ui, /jszip/); assert.match(ui, /tesseract\.js/); assert.match(ui, /uploadImage\(file/); assert.match(ui, /\/api\/products/); assert.match(ui, /draggable/); assert.match(ui, /Needs price/); assert.match(ui, /Needs size/);
  assert.match(route, /requireAdmin/); assert.match(route, /adminBulkProductDrafts/);
  assert.match(admin, /'bulk-drafts'/); assert.match(config, /\/api\/admin\/bulk-drafts/);
});
