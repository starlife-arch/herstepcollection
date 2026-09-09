import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchRoute, lazyRoute } from '../api/_lib/route-dispatch.js';

function response() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('dispatches the rewrite-selected route and rejects unknown routes', async () => {
  const selected = response();
  await dispatchRoute({ query: { route: 'orders' } }, selected, {
    orders: (_request, res) => res.status(200).json({ ok: true })
  });
  assert.equal(selected.statusCode, 200);
  assert.deepEqual(selected.body, { ok: true });

  const missing = response();
  await dispatchRoute({ query: { route: 'missing' } }, missing, {});
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(missing.body, { error: 'Endpoint not found.' });
});

test('loads only the selected lazy route module', async () => {
  const selected = response();
  let unselectedLoaded = false;
  await dispatchRoute({ query: { route: 'public-config' } }, selected, {
    'public-config': lazyRoute(async () => ({ default: (_request, res) => res.status(200).json({ configured: false }) })),
    database: lazyRoute(async () => { unselectedLoaded = true; throw new Error('must not load'); })
  });
  assert.equal(selected.statusCode, 200);
  assert.deepEqual(selected.body, { configured: false });
  assert.equal(unselectedLoaded, false);
});

test('the Firebase web-config route does not load Firebase Admin', async () => {
  const { default: catalog } = await import('../api/catalog.js');
  const result = response();
  await catalog({ method: 'GET', query: { route: 'firebase-config' } }, result);
  assert.ok([200, 503].includes(result.statusCode));
  assert.notEqual(result.statusCode, 500);
});
