import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('platform pages load Lucide and admin navigation uses named icons', async () => {
  const [storefront, adminPage, adminScript] = await Promise.all([source('index.html'), source('admin.html'), source('admin.js')]);
  assert.match(storefront, /lucide@/);
  assert.match(adminPage, /lucide@/);
  assert.match(adminScript, /const icon = \(name\)/);
  assert.match(adminScript, /icon\('layout-dashboard'\)/);
  assert.match(adminScript, /icon\('credit-card'\)/);
});

test('all required administrator record views use the shared sortable paginated table', async () => {
  const adminScript = await source('admin.js');
  assert.match(adminScript, /function renderDataTable\(/);
  for (const table of ['orders-table', 'payments-table', 'customers-table', 'audit-table']) assert.match(adminScript, new RegExp(`id:'${table}'`));
  assert.match(adminScript, /data-sort=/);
  assert.match(adminScript, /data-page="previous"/);
  assert.match(adminScript, /data-page="next"/);
});

test('status badges share one component contract across customer and admin views', async () => {
  const [adminScript, dashboard, support, styles] = await Promise.all([source('admin.js'), source('dashboard.js'), source('support.js'), source('styles.css')]);
  assert.match(adminScript, /function statusBadge\(/);
  assert.match(dashboard, /status-badge/);
  assert.match(support, /status-badge/);
  assert.match(styles, /\.status-badge,/);
  assert.match(styles, /\.status-badge-success/);
  assert.match(styles, /\.status-badge-warning/);
  assert.match(styles, /\.status-badge-danger/);
});

test('customer and administrator UI documents do not include emoji glyphs', async () => {
  const files = ['index.html', 'admin.html', 'app.js', 'admin.js', 'dashboard.js', 'support.js'];
  const ui = (await Promise.all(files.map(source))).join('\n');
  assert.doesNotMatch(ui, /[\u{1F300}-\u{1FAFF}]/u);
});
