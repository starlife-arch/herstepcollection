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

test('vision suggestions prefer Groq, then OpenAI, then optional wolfXapis before OCR fallback', async () => {
  const [ui, suggest, wolfXapis, drafts] = await Promise.all(['admin-bulk.js', 'api/_lib/routes/admin-bulk-suggest.js', 'api/_lib/wolfxapis-vision.js', 'api/_lib/routes/admin-bulk-drafts.js'].map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')));
  assert.match(suggest, /GROQ_API_KEY/);
  assert.match(suggest, /GROQ_VISION_MODEL \|\| 'meta-llama\/llama-4-scout-17b-16e-instruct'/);
  assert.match(suggest, /OPENAI_API_KEY/);
  assert.match(suggest, /WOLFXAPIS_KEY/);
  assert.match(wolfXapis, /https:\/\/apis\.xwolf\.space\/api\/nvidia\/vision/);
  assert.match(wolfXapis, /'x-api-key': process\.env\.WOLFXAPIS_KEY/);
  assert.match(suggest, /https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions/);
  assert.match(suggest, /image_url:\{ url:imageUrl \}/);
  assert.match(suggest, /response_format: \{ type:'json_object' \}/);
  assert.match(suggest, /GROQ_MIN_INTERVAL_MS = 2_100/);
  assert.match(suggest, /GROQ_RATE_LIMIT_RETRIES = 3/);
  assert.match(suggest, /result\.status !== 429/);
  assert.match(suggest, /const bodyText = await result\.text\(\)\.catch\(\(\) => ''\)/);
  assert.match(suggest, /Groq request failed \(\$\{result\.status\}\): \$\{bodyText\}/);
  assert.match(suggest, /provider:'GROQ'/);
  assert.match(suggest, /provider:'OPENAI'/);
  assert.match(suggest, /provider:'WOLFXAPIS'/);
  assert.ok(suggest.indexOf('process.env.GROQ_API_KEY') < suggest.indexOf('process.env.OPENAI_API_KEY'));
  assert.ok(suggest.indexOf('process.env.OPENAI_API_KEY') < suggest.indexOf('process.env.WOLFXAPIS_KEY'));
  assert.match(suggest, /console\.error\('Groq suggestion failed:', error\.message\)/);
  assert.match(suggest, /console\.error\('OpenAI suggestion failed:', error\.message\)/);
  assert.match(suggest, /console\.error\('wolfXapis suggestion failed:', error\.message\)/);
  assert.match(suggest, /configured:Boolean\(process\.env\.GROQ_API_KEY \|\| process\.env\.OPENAI_API_KEY \|\| process\.env\.WOLFXAPIS_KEY\), provider:null, suggestion:null/);
  assert.match(ui, /Groq suggested/);
  assert.match(ui, /OpenAI suggested/);
  assert.match(ui, /wolfXapis suggested/);
  assert.match(ui, /suggestionProvider:provider/);
  assert.match(ui, /suggestionProvider:'OCR'/);
  assert.match(ui, /AI suggestion failed — using OCR instead\./);
  assert.match(drafts, /'GROQ'/);
  assert.match(drafts, /'WOLFXAPIS'/);
});

test('wolfXapis text responses extract only a complete JSON object', async () => {
  const { parseWolfXapisSuggestion } = await import('../api/_lib/wolfxapis-vision.js');
  assert.deepEqual(
    parseWolfXapisSuggestion('Here is the result:\n```json\n{"name":"Gold heel","categoryId":"heels","price":1500,"size":"37"}\n```'),
    { name: 'Gold heel', categoryId: 'heels', price: 1500, size: '37' }
  );
  assert.deepEqual(parseWolfXapisSuggestion('{"name":"A {brace}"} trailing prose'), { name: 'A {brace}' });
  assert.throws(() => parseWolfXapisSuggestion('not JSON'), /did not include JSON/);
  assert.throws(() => parseWolfXapisSuggestion('{"name":'), /incomplete JSON/);
});

test('wolfXapis sends the configured key and preserves the full failure body', async () => {
  const { wolfXapisSuggestion } = await import('../api/_lib/wolfxapis-vision.js');
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.WOLFXAPIS_KEY;
  process.env.WOLFXAPIS_KEY = 'wxa_f_test';
  try {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, text: async () => 'Result: {"name":"Black flat"}' };
    };
    assert.deepEqual(await wolfXapisSuggestion({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/shoe.jpg', prompt: 'Return JSON.' }), { name: 'Black flat' });
    assert.match(request.url, /^https:\/\/apis\.xwolf\.space\/api\/nvidia\/vision\?/);
    assert.equal(new URL(request.url).searchParams.get('imageUrl'), 'https://res.cloudinary.com/demo/image/upload/shoe.jpg');
    assert.equal(request.options.headers['x-api-key'], 'wxa_f_test');
    globalThis.fetch = async () => ({ ok: false, status: 503, text: async () => 'Endpoint is temporarily disabled by admin' });
    await assert.rejects(() => wolfXapisSuggestion({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/shoe.jpg', prompt: 'Return JSON.' }), /503\): Endpoint is temporarily disabled by admin/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.WOLFXAPIS_KEY;
    else process.env.WOLFXAPIS_KEY = originalKey;
  }
});
