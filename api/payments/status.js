import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../_lib/http.js';
import { paymentResponse } from '../_lib/payment.js';
import { getMpesaProvider } from '../_lib/mpesa-provider.js';
import { applyVerifiedCallback } from '../_lib/payment-service.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const user = await requireUser(request);
    const paymentId = typeof request.query?.paymentId === 'string' ? request.query.paymentId : '';
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(paymentId)) throw clientError('A valid payment identifier is required.');
    const snapshot = await adminDb.collection('payments').doc(paymentId).get();
    if (!snapshot.exists) throw clientError('Payment not found.', 404);
    let payment = snapshot.data();
    if (payment.customerId !== user.uid) throw clientError('You are not allowed to view this payment.', 403);
    // Polling never proves payment from the browser: it asks PrintPay's server API about the
    // checkout ID stored by our server and only then applies a terminal provider result.
    if (payment.status === 'PENDING' && payment.providerReference) {
      const checked = await getMpesaProvider().checkStatus(payment.providerReference);
      if (checked.status !== 'PENDING') {
        const applied = await applyVerifiedCallback({ db: adminDb, callback: checked });
        payment = applied.payment;
      }
    }
    return response.status(200).json({ payment: paymentResponse(payment) });
  } catch (error) { return sendError(response, error); }
}
