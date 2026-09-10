import { FieldValue } from 'firebase-admin/firestore';
import { assertOrderCanBePaid, assertPaymentTransition, assertVerifiedPaymentAmount, paymentReceiptNumber, validateVerifiedCallback } from './payment.js';
import { clientError } from './http.js';
import { createNotification } from './notification.js';
import { deliverQueuedEmailInline, queueEmail, emailHtml } from './email-service.js';

function timestamp(value) { return value?.toDate?.().toISOString() || null; }

export async function createPaymentAttempt({ db, customerId, orderDocumentId }) {
  return db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderDocumentId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw clientError('Order not found.', 404);
    const order = orderSnapshot.data();
    assertOrderCanBePaid(order, customerId);
    if (order.activePaymentId) {
      const activeRef = db.collection('payments').doc(order.activePaymentId);
      const activeSnapshot = await transaction.get(activeRef);
      if (activeSnapshot.exists && activeSnapshot.data().status === 'PENDING') return { payment: activeSnapshot.data(), existing: true };
    }
    const paymentRef = db.collection('payments').doc();
    const payment = {
      paymentId: paymentRef.id, receiptNumber: null, orderDocumentId, orderId: order.orderId,
      customerId, amount: order.total, currency: order.currency || 'KES', phone: order.delivery?.phone || null,
      method: 'MPESA', status: 'PENDING', providerReference: null, transactionReference: null,
      failureReason: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), initiatedAt: FieldValue.serverTimestamp()
    };
    transaction.create(paymentRef, payment);
    transaction.update(orderRef, { activePaymentId: paymentRef.id, updatedAt: FieldValue.serverTimestamp() });
    return { payment, existing: false };
  });
}

export async function attachProviderReference({ db, paymentId, providerReference }) {
  if (typeof providerReference !== 'string' || !providerReference.trim()) throw clientError('The payment provider did not return a request reference.', 502);
  await db.runTransaction(async (transaction) => {
    const reference = db.collection('payments').doc(paymentId); const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.data().status !== 'PENDING') throw clientError('The payment attempt is no longer pending.', 409);
    transaction.update(reference, { providerReference: providerReference.trim().slice(0, 180), updatedAt: FieldValue.serverTimestamp() });
  });
}

export async function applyVerifiedCallback({ db, callback }) {
  const verified = validateVerifiedCallback(callback);
  const result = await db.runTransaction(async (transaction) => {
    const matches = await transaction.get(db.collection('payments').where('providerReference', '==', verified.providerReference).limit(1));
    if (matches.empty) throw clientError('Payment request not found.', 404);
    const paymentRef = matches.docs[0].ref; const payment = matches.docs[0].data();
    const orderRef = db.collection('orders').doc(payment.orderDocumentId); const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists || orderSnapshot.data().orderId !== payment.orderId) throw clientError('Payment order association is invalid.', 409);
    assertVerifiedPaymentAmount(payment.amount, verified.amount);
    if (payment.status === verified.status && (verified.status !== 'PAID' || payment.transactionReference === verified.transactionReference)) return { duplicate: true, payment };
    assertPaymentTransition(payment.status, verified.status);
    const eventId = verified.eventId || `${verified.providerReference}:${verified.status}:${verified.transactionReference || 'none'}`;
    const eventRef = db.collection('paymentTransactions').doc(Buffer.from(eventId).toString('base64url').slice(0, 180));
    const eventSnapshot = await transaction.get(eventRef);
    if (eventSnapshot.exists) return { duplicate: true, payment };
    const updates = { status: verified.status, transactionReference: verified.transactionReference, failureReason: verified.failureReason, providerStatus: verified.status, updatedAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp() };
    if (verified.status === 'PAID') updates.receiptNumber = paymentReceiptNumber(payment.paymentId);
    transaction.update(paymentRef, updates);
    transaction.create(eventRef, { paymentId: payment.paymentId, orderDocumentId: payment.orderDocumentId, providerReference: verified.providerReference, eventId, status: verified.status, amount: verified.amount, transactionReference: verified.transactionReference, createdAt: FieldValue.serverTimestamp() });
    transaction.update(orderRef, { paymentStatus: verified.status, paymentId: payment.paymentId, paymentReference: verified.status === 'PAID' ? verified.transactionReference : null, updatedAt: FieldValue.serverTimestamp() });
    const notification = verified.status === 'PAID'
      ? ['Payment confirmed', `Your payment for order ${payment.orderId} has been confirmed.`]
      : ['Payment update', `Your payment for order ${payment.orderId} is ${verified.status.toLowerCase()}.`];
    transaction.create(db.collection('orderStatusHistory').doc(`${payment.orderDocumentId}-PAYMENT-${verified.status}`), { orderId: payment.orderId, orderDocumentId: payment.orderDocumentId, customerId: payment.customerId, eventType: 'PAYMENT_STATUS_CHANGED', previousStatus: null, newStatus: null, paymentStatus: verified.status, note: verified.failureReason, source: 'PRINTPAY', paymentId: payment.paymentId, createdAt: FieldValue.serverTimestamp() });
    createNotification(transaction, db, { orderDocumentId: payment.orderDocumentId, customerId: payment.customerId, event: `PAYMENT_${verified.status}`, title: notification[0], body: notification[1] });
    const emailKey = orderSnapshot.data().customerEmail ? `${payment.orderDocumentId}-PAYMENT_${verified.status}` : null;
    if (emailKey) queueEmail(transaction, db, { key: emailKey, purpose: 'payments', to: orderSnapshot.data().customerEmail, subject: notification[0], htmlContent: emailHtml(notification[0], notification[1]) });
    return { duplicate: false, payment: { ...payment, ...updates, createdAt: timestamp(payment.createdAt) }, emailKey };
  });
  if (result.emailKey) await deliverQueuedEmailInline({ db, key: result.emailKey });
  delete result.emailKey;
  return result;
}
