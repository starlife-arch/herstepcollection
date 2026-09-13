import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sendTelegramMessage } from '../api/_lib/telegram.js';

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('Telegram helper skips missing configuration and swallows network failures', async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID; const originalFetch = globalThis.fetch;
  delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID;
  assert.equal(await sendTelegramMessage('test'), false);
  process.env.TELEGRAM_BOT_TOKEN = 'token'; process.env.TELEGRAM_CHAT_ID = 'chat';
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await sendTelegramMessage('test'), false);
  globalThis.fetch = originalFetch;
  if (token === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = token;
  if (chatId === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = chatId;
});

test('order image snapshots and current-product fallbacks reach both order views', async () => {
  const [create, adminRoute, dashboardRoute, dashboard, admin, tracking] = await Promise.all(['api/_lib/order-create-handler.js', 'api/_lib/routes/admin-orders.js', 'api/_lib/routes/dashboard.js', 'dashboard.js', 'admin.js', 'api/_lib/routes/orders-track.js'].map(source));
  assert.match(create, /imageUrl = product\.images\?\.\[0\]\?\.url \|\| null/);
  for (const file of [adminRoute, dashboardRoute, tracking]) assert.match(file, /images\.get\(item\.productId\)/);
  assert.match(dashboard, /order-item-thumbnail/); assert.match(admin, /order-item-thumbnail/);
});

test('hero autoplay is 5.5 seconds, resets after manual controls, and disables controls for one slide', async () => {
  const app = await source('app.js');
  assert.match(app, /setInterval\(\(\) => show\(index \+ 1\), 5500\)/);
  assert.match(app, /hero\.slides\.length > 1/);
  assert.match(app, /hero\.slides\.length === 1\) controls\.hidden = true/);
  assert.match(app, /show\(slideIndex\); restart\(\)/);
  assert.match(app, /show\(index - 1\); restart\(\)/);
});
