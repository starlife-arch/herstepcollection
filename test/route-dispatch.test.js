import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchRoute } from '../api/_lib/route-dispatch.js';

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
