import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../_lib/http.js';
import { assertReceiptAvailable } from '../_lib/payment.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const user = await requireUser(request);
    const paymentId = typeof request.query?.paymentId === 'string' ? request.query.paymentId : '';
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(paymentId)) throw clientError('A valid payment identifier is required.');
    const snapshot = await adminDb.collection('payments').doc(paymentId).get();
    if (!snapshot.exists) throw clientError('Payment not found.', 404);
    const payment = snapshot.data();
    if (payment.customerId !== user.uid) throw clientError('You are not allowed to view this receipt.', 403);
    assertReceiptAvailable(payment);
    return response.status(200).json({ receipt: { receiptNumber: payment.receiptNumber, orderId: payment.orderId, amount: payment.amount, currency: payment.currency, method: 'M-Pesa', transactionReference: payment.transactionReference || null, status: payment.status, paidAt: payment.completedAt?.toDate?.().toISOString() || null } });
  } catch (error) { return sendError(response, error); }
}
