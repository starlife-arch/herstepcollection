import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel serves static assets before applying the SPA fallback', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const filesystem = config.routes.findIndex((route) => route.handle === 'filesystem');
  const fallback = config.routes.findIndex((route) => route.src === '/(.*)');

  assert.ok(filesystem >= 0, 'Vercel routes must include filesystem handling for JS, CSS, and other assets.');
  assert.ok(fallback > filesystem, 'The SPA fallback must run only after static assets are served.');
  assert.ok(config.routes.slice(0, filesystem).every((route) => route.src?.startsWith('/api/')),
    'All API routes must be evaluated before static asset handling.');
});
