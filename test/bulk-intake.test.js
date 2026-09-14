import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readBadge } from '../admin-bulk.js';

test('OCR classification accepts only unambiguous catalogue-sized numbers and prices', () => {
  assert.deepEqual(readBadge('NEW 1,500 37'), { price: 500, size: '37' });
  assert.deepEqual(readBadge('37/38 1200'), { price: 1200, size: '37' });
  assert.deepEqual(readBadge('brand 39 900 1200'), { price: null, size: '39' });
  assert.deepEqual(readBadge('logo only'), { price: null, size: null });
  assert.deepEqual(readBadge('33 900'), { price: 900, size: '33' });
  assert.deepEqual(readBadge('44 1300'), { price: 1300, size: '44' });
});

test('bulk intake uses signed uploads, browser ZIP extraction, persisted admin drafts, and existing product POST validation', async () => {
  const [ui, route, admin, config, suggest, validation] = await Promise.all(['admin-bulk.js','api/_lib/routes/admin-bulk-drafts.js','api/admin.js','vercel.json','api/_lib/routes/admin-bulk-suggest.js','api/_lib/bulk-suggestion-validation.js'].map(async (file) => file.endsWith('.json') ? readFile(new URL(`../${file}`, import.meta.url), 'utf8') : readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(ui, /originalFile/); assert.match(ui, /createWorker\('eng'\)/); assert.match(ui, /tessedit_pageseg_mode: PSM\.SPARSE_TEXT/); assert.match(ui, /worker\.recognize\(originalFile\)/); assert.match(ui, /worker\.terminate\(\)/); assert.match(ui, /bulk-suggest/); assert.match(ui, /AI suggested/); assert.match(ui, /error\.status !== 404/); assert.match(ui, /jszip/); assert.match(ui, /tesseract\.js/); assert.match(ui, /uploadImage\(originalFile/); assert.match(ui, /\/api\/products/); assert.match(ui, /draggable/); assert.match(ui, /Needs price/); assert.match(ui, /Needs size/);
  assert.match(route, /requireAdmin/); assert.match(route, /adminBulkProductDrafts/); assert.match(route, /Draft size must be between 30 and 45/); assert.match(ui, /'30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45'/);
  assert.match(admin, /'bulk-drafts'/); assert.match(admin, /'bulk-suggest'/); assert.match(suggest, /OPENAI_API_KEY/); assert.match(suggest, /input_image/); assert.match(suggest, /keys name, categoryId, price, and size/); assert.match(validation, /Number\.isInteger\(parsed\?\.price\).*parsed\.price >= 0/); assert.match(validation, /sizes\.has\(parsed\.size\)/); assert.match(ui, /result\.configured === false/); assert.match(ui, /aiPrice/); assert.match(ui, /aiSize/); assert.match(config, /\/api\/admin\/bulk-drafts/);
});

test('AI vision suggestions reject invalid price and size values before reaching drafts', async () => {
  const { cleanBulkSuggestion } = await import('../api/_lib/bulk-suggestion-validation.js');
  const categories = [{ id: 'heels', name: 'Heels' }];
  assert.deepEqual(cleanBulkSuggestion({ name: '  Gold heel  ', categoryId: 'heels', price: 1500, size: '37' }, categories), { name: 'Gold heel', categoryId: 'heels', price: 1500, size: '37' });
  assert.deepEqual(cleanBulkSuggestion({ name: 'Bad output', categoryId: 'not-a-category', price: -1, size: '46' }, categories), { name: 'Bad output', categoryId: '', price: null, size: null });
  assert.deepEqual(cleanBulkSuggestion({ price: 1500.5, size: '37/38' }, categories), { name: '', categoryId: '', price: null, size: null });
});

test('bulk intake can retry an existing draft suggestion and defaults a publish batch to new arrivals', async () => {
  const ui = await readFile(new URL('../admin-bulk.js', import.meta.url), 'utf8');
  assert.match(ui, /Retry AI suggestion/);
  assert.match(ui, /const retrySuggestion/);
  assert.match(ui, /draft\.images\?\.\[0\]\?\.url/);
  assert.match(ui, /id="bulk-new-arrival" type="checkbox" checked/);
  assert.match(ui, /newArrival:content\.querySelector\('#bulk-new-arrival'\)\.checked/);
});

test('vision suggestions prefer rate-limited Gemini, then reuse OpenAI before OCR fallback', async () => {
  const [ui, suggest, drafts] = await Promise.all(['admin-bulk.js', 'api/_lib/routes/admin-bulk-suggest.js', 'api/_lib/routes/admin-bulk-drafts.js'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(suggest, /GEMINI_API_KEY/);
  assert.match(suggest, /GEMINI_VISION_MODEL \|\| 'gemini-2\.5-flash-lite'/);
  assert.match(suggest, /OPENAI_API_KEY/);
  assert.match(suggest, /inlineData:\{ mimeType, data:imageBytes \}/);
  assert.match(suggest, /generationConfig: \{ responseMimeType:'application\/json' \}/);
  assert.match(suggest, /GEMINI_MIN_INTERVAL_MS = 4_100/);
  assert.match(suggest, /GEMINI_RATE_LIMIT_RETRIES = 3/);
  assert.match(suggest, /result\.status !== 429/);
  assert.match(suggest, /const bodyText = await result\.text\(\)\.catch\(\(\) => ''\)/);
  assert.match(suggest, /Gemini request failed \(\$\{result\.status\}\): \$\{bodyText\}/);
  assert.match(suggest, /provider:'GEMINI'/);
  assert.match(suggest, /provider:'OPENAI'/);
  assert.match(suggest, /console\.error\('Gemini suggestion failed:', error\.message\)/);
  assert.match(suggest, /console\.error\('OpenAI suggestion failed:', error\.message\)/);
  assert.match(suggest, /configured:Boolean\(process\.env\.GEMINI_API_KEY \|\| process\.env\.OPENAI_API_KEY\), provider:null, suggestion:null/);
  assert.match(ui, /Gemini suggested/);
  assert.match(ui, /OpenAI suggested/);
  assert.match(ui, /suggestionProvider:provider/);
  assert.match(ui, /suggestionProvider:'OCR'/);
  assert.match(ui, /AI suggestion failed — using OCR instead\./);
  assert.match(drafts, /suggestionProvider/);
});
