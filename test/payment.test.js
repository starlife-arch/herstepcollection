import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOrderCanBePaid, assertPaymentTransition, assertReceiptAvailable, assertVerifiedPaymentAmount, paymentReceiptNumber, validatePaymentInitiation, validateVerifiedCallback } from '../api/_lib/payment.js';

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
