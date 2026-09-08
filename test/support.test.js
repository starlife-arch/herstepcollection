import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTicketTransition, validateMessageCreate, validateTicketCreate } from '../api/_lib/support.js';
import { createSupportMessage, updateSupportTicketStatus } from '../api/_lib/support-service.js';
import { createAdminSupportListHandler } from '../api/_lib/support-admin-handler.js';

function supportDb(ticket) {
  const documents = new Map([[`supportTickets/ticket-12345678`, ticket]]);
  const ref = (path) => ({ path, id: path.split('/').at(-1), collection(name) { return { doc: (id) => ref(`${path}/${name}/${id}`) }; } });
  const db = { collection(name) { return { doc: (id) => ref(`${name}/${id || `generated-${documents.size}`}`) }; }, async runTransaction(work) { const transaction = { async get(reference) { const data = documents.get(reference.path); return { exists: Boolean(data), data: () => data }; }, create(reference, data) { if (documents.has(reference.path)) throw new Error('duplicate document'); documents.set(reference.path, data); }, update(reference, data) { documents.set(reference.path, { ...documents.get(reference.path), ...data }); } }; return work(transaction); } };
  return { db, documents };
}

test('rejects a customer attempting to write another customer support ticket', async () => {
  const { db } = supportDb({ customerId: 'customer-1', ticketId: 'SUP-000001', status: 'OPEN' });
  await assert.rejects(() => createSupportMessage({ db, actor: { uid: 'customer-2', isAdmin: false }, input: { ticketDocumentId: 'ticket-12345678', message: 'Please help', clientMessageId: 'message-12345678' } }), /not allowed/);
});

test('creates one admin-reply notification for an idempotent message retry', async () => {
  const { db, documents } = supportDb({ customerId: 'customer-1', ticketId: 'SUP-000001', status: 'OPEN' });
  const input = { ticketDocumentId: 'ticket-12345678', message: 'We are reviewing this.', clientMessageId: 'message-12345678' };
  const first = await createSupportMessage({ db, actor: { uid: 'admin-1', isAdmin: true }, input });
  const second = await createSupportMessage({ db, actor: { uid: 'admin-1', isAdmin: true }, input });
  assert.equal(first.duplicate, false); assert.equal(second.duplicate, true);
  assert.equal(documents.get('notifications/ticket-12345678-SUPPORT_REPLY_message-12345678').customerId, 'customer-1');
  assert.equal([...documents.keys()].filter((key) => key.startsWith('notifications/')).length, 1);
});

test('guards support ticket status transitions and only permits admin updates in the service boundary', async () => {
  assert.throws(() => assertTicketTransition('CLOSED', 'OPEN'), /transition/);
  assert.doesNotThrow(() => assertTicketTransition('RESOLVED', 'IN_PROGRESS'));
  const { db, documents } = supportDb({ customerId: 'customer-1', ticketId: 'SUP-000001', status: 'OPEN' });
  await updateSupportTicketStatus({ db, ticketDocumentId: 'ticket-12345678', status: 'IN_PROGRESS', admin: { uid: 'admin-1', name: 'Ada' } });
  assert.equal(documents.get('supportTickets/ticket-12345678').status, 'IN_PROGRESS');
});

test('validates only server-supported ticket and message fields', () => {
  assert.throws(() => validateTicketCreate({ subject: 'Help', message: 'Need help', status: 'CLOSED' }), /unsupported/);
  assert.throws(() => validateMessageCreate({ ticketDocumentId: 'ticket-12345678', message: '', clientMessageId: 'message-12345678' }), /Enter a message/);
});

test('rejects a non-admin customer from the all-ticket admin list', async () => {
  const response = { statusCode: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() {} };
  const nonAdmin = Object.assign(new Error('Administrator access is required.'), { statusCode: 403 });
  const handler = createAdminSupportListHandler({ db: {}, requireAdministrator: async () => { throw nonAdmin; } });
  await handler({ method: 'GET', query: {} }, response);
  assert.equal(response.statusCode, 403);
});
