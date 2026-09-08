import { clientError } from './http.js';

export const PAYMENT_STATUSES = new Set(['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'TIMEOUT', 'REFUNDED']);
const TRANSITIONS = {
  PENDING: new Set(['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'TIMEOUT']),
  PAID: new Set(['PAID', 'REFUNDED']),
  FAILED: new Set(['FAILED']),
  CANCELLED: new Set(['CANCELLED']),
  TIMEOUT: new Set(['TIMEOUT']),
  REFUNDED: new Set(['REFUNDED'])
};

export function assertPaymentTransition(current, next) {
  if (!PAYMENT_STATUSES.has(next) || !TRANSITIONS[current]?.has(next)) {
    throw clientError('The payment status transition is invalid.', 409);
  }
}

export function paymentReceiptNumber(paymentId) {
  if (typeof paymentId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(paymentId)) throw new Error('Invalid payment identifier.');
  return `HSP-${paymentId.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
}

export function validatePaymentInitiation(input) {
  const allowed = new Set(['orderDocumentId']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) {
    throw clientError('Payment requests may only contain an order identifier.');
  }
  const orderDocumentId = typeof input.orderDocumentId === 'string' ? input.orderDocumentId.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(orderDocumentId)) throw clientError('A valid order identifier is required.');
  return { orderDocumentId };
}

export function validateVerifiedCallback(callback) {
  if (!callback || typeof callback !== 'object') throw clientError('The payment callback is invalid.');
  const providerReference = typeof callback.providerReference === 'string' ? callback.providerReference.trim().slice(0, 180) : '';
  const status = typeof callback.status === 'string' ? callback.status : '';
  const transactionReference = callback.transactionReference == null ? null : String(callback.transactionReference).trim().slice(0, 180);
  const amount = callback.amount;
  if (!providerReference || !PAYMENT_STATUSES.has(status) || !Number.isInteger(amount) || amount < 0) {
    throw clientError('The verified payment callback is incomplete.');
  }
  if (status === 'PENDING' || status === 'REFUNDED') throw clientError('The provider callback has an unsupported status.');
  return {
    providerReference,
    status,
    amount,
    transactionReference: transactionReference || null,
    failureReason: callback.failureReason == null ? null : String(callback.failureReason).trim().slice(0, 300),
    eventId: typeof callback.eventId === 'string' ? callback.eventId.trim().slice(0, 180) : null,
    occurredAt: callback.occurredAt instanceof Date ? callback.occurredAt : null
  };
}

export function assertVerifiedPaymentAmount(expectedAmount, receivedAmount) {
  if (!Number.isInteger(expectedAmount) || expectedAmount < 0 || expectedAmount !== receivedAmount) {
    throw clientError('Payment amount does not match the order.', 409);
  }
}

export function assertOrderCanBePaid(order, customerId) {
  if (!order) throw clientError('Order not found.', 404);
  if (order.customerId !== customerId) throw clientError('You are not allowed to pay for this order.', 403);
  if (order.paymentStatus === 'PAID') throw clientError('This order has already been paid.', 409);
  if (order.orderStatus === 'CANCELLED' || order.paymentStatus !== 'PENDING' || !Number.isInteger(order.total) || order.total < 0) {
    throw clientError('This order is not eligible for payment.', 409);
  }
}

export function assertReceiptAvailable(payment) {
  if (!payment || payment.status !== 'PAID' || !payment.receiptNumber) {
    throw clientError('A receipt is available after verified payment confirmation.', 409);
  }
}

export function paymentResponse(payment) {
  return {
    id: payment.paymentId,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    receiptNumber: payment.status === 'PAID' ? payment.receiptNumber : null,
    transactionReference: payment.status === 'PAID' ? payment.transactionReference || null : null,
    failureReason: ['FAILED', 'CANCELLED', 'TIMEOUT'].includes(payment.status) ? payment.failureReason || 'Payment was not completed.' : null
  };
}
