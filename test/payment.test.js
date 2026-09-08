import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOrderCanBePaid, assertPaymentTransition, assertReceiptAvailable, assertVerifiedPaymentAmount, paymentReceiptNumber, validatePaymentInitiation, validateVerifiedCallback } from '../api/_lib/payment.js';
import { createPrintPayProvider } from '../api/_lib/mpesa-provider.js';
import { applyVerifiedCallback } from '../api/_lib/payment-service.js';

function providerWith(responses) {
  const calls = [];
  const provider = createPrintPayProvider({ apiKey: 'server-secret', baseUrl: 'https://printpay.site/api', fetchImpl: async (url, options) => {
    calls.push({ url, options }); const response = responses.shift();
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  } });
  return { provider, calls };
}

function paymentDb({ payment, order }) {
  const documents = new Map([
    [`payments/${payment.paymentId}`, payment],
    [`orders/${payment.orderDocumentId}`, order]
  ]);
  const documentRef = (path) => ({ path, id: path.split('/').at(-1) });
  const db = {
    collection(name) {
      return {
        doc(id) { return documentRef(`${name}/${id || `generated-${documents.size}`}`); },
        where(field, operator, value) { return { kind: 'query', name, field, operator, value, limit() { return this; } }; }
      };
    },
    async runTransaction(work) {
      const transaction = {
        async get(target) {
          if (target.kind === 'query') {
            const docs = [...documents.entries()].filter(([path, data]) => path.startsWith(`${target.name}/`) && data[target.field] === target.value).map(([path, data]) => ({ ref: documentRef(path), data: () => data }));
            return { empty: docs.length === 0, docs };
          }
          const data = documents.get(target.path);
          return { exists: Boolean(data), data: () => data };
        },
        update(ref, updates) { documents.set(ref.path, { ...documents.get(ref.path), ...updates }); },
        create(ref, data) { if (documents.has(ref.path)) throw new Error('duplicate document'); documents.set(ref.path, data); }
      };
      return work(transaction);
    }
  };
  return { db, documents };
}

test('rejects unauthorized-shaped and client-supplied fake payment initiation fields', () => {
  assert.throws(() => validatePaymentInitiation({}), /order identifier/);
  assert.throws(() => validatePaymentInitiation({ orderDocumentId: 'abcdefgh', status: 'PAID' }), /only contain/);
  assert.throws(() => validatePaymentInitiation({ orderDocumentId: 'abcdefgh', transactionReference: 'FAKE' }), /only contain/);
  assert.deepEqual(validatePaymentInitiation({ orderDocumentId: 'abcdefgh' }), { orderDocumentId: 'abcdefgh' });
});

test('does not allow an already-paid payment to return to pending', () => {
  assert.throws(() => assertPaymentTransition('PAID', 'PENDING'), /transition/);
  assert.doesNotThrow(() => assertPaymentTransition('PAID', 'REFUNDED'));
});

test('rejects unknown orders, unauthorized payment requests, and already-paid orders', () => {
  assert.throws(() => assertOrderCanBePaid(null, 'customer-1'), /not found/);
  assert.throws(() => assertOrderCanBePaid({ customerId: 'customer-2', paymentStatus: 'PENDING', orderStatus: 'PENDING', total: 850 }, 'customer-1'), /not allowed/);
  assert.throws(() => assertOrderCanBePaid({ customerId: 'customer-1', paymentStatus: 'PAID', orderStatus: 'PENDING', total: 850 }, 'customer-1'), /already been paid/);
});

test('validates callback shape without treating unverified client data as success', () => {
  assert.throws(() => validateVerifiedCallback({ providerReference: 'request-1', status: 'PAID', amount: '850' }), /incomplete/);
  assert.deepEqual(validateVerifiedCallback({ providerReference: 'request-1', status: 'CANCELLED', amount: 850, failureReason: 'Customer cancelled' }), { providerReference: 'request-1', status: 'CANCELLED', amount: 850, transactionReference: null, failureReason: 'Customer cancelled', eventId: null, occurredAt: null });
});

test('rejects incorrect callback amounts before an order can be paid', () => {
  assert.throws(() => assertVerifiedPaymentAmount(850, 800), /does not match/);
  assert.doesNotThrow(() => assertVerifiedPaymentAmount(850, 850));
});

test('uses a deterministic payment receipt identifier only after a trusted payment id exists', () => {
  assert.equal(paymentReceiptNumber('abcdEFGH1234'), 'HSP-ABCDEFGH1234');
  assert.throws(() => paymentReceiptNumber('short'), /Invalid/);
});

test('keeps receipts unavailable before payment and available only after verified payment', () => {
  assert.throws(() => assertReceiptAvailable({ status: 'PENDING', receiptNumber: null }), /available after/);
  assert.doesNotThrow(() => assertReceiptAvailable({ status: 'PAID', receiptNumber: 'HSP-ABCDEFGH' }));
});

test('rejects unsupported callback transitions and duplicate terminal changes', () => {
  assert.throws(() => assertPaymentTransition('FAILED', 'PAID'), /transition/);
  assert.doesNotThrow(() => assertPaymentTransition('CANCELLED', 'CANCELLED'));
});

test('initiates PrintPay STK with a server-only API key and trusted form fields', async () => {
  const { provider, calls } = providerWith([{ body: { status: 'success', checkout_id: 'ws_CO_123' } }]);
  const result = await provider.initiateStk({ phone: '+254799021089', amount: 850 });
  assert.deepEqual(result, { providerReference: 'ws_CO_123' });
  assert.equal(calls[0].url, 'https://printpay.site/api/stk_push');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(calls[0].options.body, 'x_api_key=server-secret&phone_number=%2B254799021089&amount=850');
});

test('verifies a successful PrintPay status result before it can be marked paid', async () => {
  const { provider, calls } = providerWith([{ body: { status: 'SUCCESS', phone_number: '+254799021089', amount: 850, mpesa_receipt_number: 'TST123' } }]);
  const result = await provider.checkStatus('ws_CO_123');
  assert.equal(calls[0].url, 'https://printpay.site/api/stk_push?check_status=ws_CO_123');
  assert.deepEqual(result, { providerReference: 'ws_CO_123', status: 'PAID', amount: 850, transactionReference: 'TST123', failureReason: null, eventId: 'status:ws_CO_123:TST123' });
});

test('maps PrintPay cancellation, timeout, and credential failure callback codes', async () => {
  const { provider } = providerWith([]);
  const cancelled = await provider.verifyCallback({ body: { checkout_id: 'ws_CO_1', status: 'FAILED', mpesa_receipt: '', amount: '850', result_code: '1032' } });
  const timeout = await provider.verifyCallback({ body: { checkout_id: 'ws_CO_2', status: 'FAILED', mpesa_receipt: '', amount: '850', result_code: '1037' } });
  const rejected = await provider.verifyCallback({ body: { checkout_id: 'ws_CO_3', status: 'FAILED', mpesa_receipt: '', amount: '850', result_code: '2001' } });
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(timeout.status, 'TIMEOUT');
  assert.equal(rejected.status, 'FAILED');
});

test('rejects PrintPay provider failures, invalid checkout ids, and network failures', async () => {
  const credentialFailure = providerWith([{ status: 401, body: { status: 'error' } }]).provider;
  await assert.rejects(() => credentialFailure.initiateStk({ phone: '+254799021089', amount: 850 }), /could not complete/);
  const provider = providerWith([]).provider;
  await assert.rejects(() => provider.verifyCallback({ body: { checkout_id: '', amount: 850, result_code: 0 } }), /checkout reference/);
  const networkFailure = providerWith([new Error('offline')]).provider;
  await assert.rejects(() => networkFailure.initiateStk({ phone: '+254799021089', amount: 850 }), /could not be reached/);
});

test('processes a successful PrintPay callback once and keeps a duplicate idempotent', async () => {
  const payment = { paymentId: 'payment-12345678', orderDocumentId: 'order-12345678', orderId: 'HS-2026-000001', providerReference: 'ws_CO_123', amount: 850, status: 'PENDING' };
  const { db, documents } = paymentDb({ payment, order: { orderId: payment.orderId, paymentStatus: 'PENDING' } });
  const callback = { providerReference: 'ws_CO_123', status: 'PAID', amount: 850, transactionReference: 'TST123', eventId: 'callback-123' };
  const first = await applyVerifiedCallback({ db, callback });
  const second = await applyVerifiedCallback({ db, callback });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(documents.get('payments/payment-12345678').status, 'PAID');
  assert.equal(documents.get('orders/order-12345678').paymentStatus, 'PAID');
  assert.equal(documents.get('payments/payment-12345678').transactionReference, 'TST123');
});
