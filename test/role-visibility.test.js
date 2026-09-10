import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('customer and unauthenticated HTML do not ship admin navigation controls', async () => {
  const [storefront, adminPage] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../admin.html', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(storefront, /id="admin-link"/);
  assert.doesNotMatch(storefront, />Admin dashboard</);
  assert.doesNotMatch(adminPage, /id="admin-nav"/);
  assert.doesNotMatch(adminPage, /Support inbox/);
});

test('admin controls are created only after a trusted role check succeeds', async () => {
  const [storefrontScript, adminScript] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../admin.js', import.meta.url), 'utf8')
  ]);

  assert.match(storefrontScript, /\['ADMIN', 'SUPER_ADMIN'\]\.includes\(profile\.data\(\)\?\.role\)/);
  assert.match(storefrontScript, /document\.createElement\('a'\)/);
  assert.match(adminScript, /await api\('\/api\/admin\/dashboard'\)/);
  assert.match(adminScript, /mountWorkspace\(\)/);
});
