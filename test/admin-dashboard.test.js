import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminDashboard } from '../api/_lib/admin-dashboard-service.js';
import { createAdminDashboardHandler } from '../api/_lib/admin-dashboard-handler.js';

function dashboardDb(records) {
  const docs = (name) => (records[name] || []).map(([id, data]) => ({ id, data: () => data }));
  const query = (name, filters = []) => ({ where(field, operator, value) { return query(name, [...filters, [field, value]]); }, orderBy() { return this; }, limit() { return this; }, async get() { return { docs: docs(name).filter((doc) => filters.every(([field, value]) => doc.data()[field] === value)) }; }, count() { const total = docs(name).filter((doc) => filters.every(([field, value]) => doc.data()[field] === value)).length; return { get: async () => ({ data: () => ({ count: total }) }) }; } });
  return { collection(name) { return query(name); } };
}

test('admin aggregation reflects current collection records rather than client or cached figures', async () => {
  const db = dashboardDb({
    orders: [['o1', { orderId: 'HS-1', customerId: 'c1', total: 800, orderStatus: 'PENDING', paymentStatus: 'PENDING' }], ['o2', { orderId: 'HS-2', customerId: 'c2', total: 900, orderStatus: 'DELIVERED', paymentStatus: 'PAID' }]],
    payments: [['p1', { orderId: 'HS-1', amount: 800, status: 'PENDING' }], ['p2', { orderId: 'HS-2', amount: 900, status: 'FAILED' }]],
    supportTickets: [['s1', { ticketId: 'SUP-1', subject: 'Help', status: 'OPEN', customerId: 'c1' }]], discountRequests: [['d1', { status: 'PENDING' }]], bulkOrderRequests: [['b1', { status: 'PENDING' }]], promotions: [['pr1', { active: true }]], promoCodes: [['pc1', { usageCount: 4 }]]
  });
  const result = await buildAdminDashboard({ db });
  assert.equal(result.orders.total, 2); assert.equal(result.orders.pending, 1); assert.equal(result.orders.delivered, 1);
  assert.equal(result.payments.failureOrCancellationRate, 50); assert.equal(result.support.open, 1); assert.equal(result.support.unassigned, 1);
  assert.equal(result.requests.discountPending, 1); assert.equal(result.requests.bulkPending, 1); assert.equal(result.promotions.promoCodeUses, 4);
});

test('rejects a non-admin from the new admin aggregation endpoint', async () => {
  const response = { statusCode: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
  const denied = Object.assign(new Error('Administrator access is required.'), { statusCode: 403 });
  const handler = createAdminDashboardHandler({ db: {}, requireAdministrator: async () => { throw denied; }, buildDashboard: async () => ({}) });
  await handler({ method: 'GET' }, response); assert.equal(response.statusCode, 403);
});
