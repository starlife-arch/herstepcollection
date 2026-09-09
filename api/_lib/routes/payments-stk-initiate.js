import { adminDb, requireUser } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { getMpesaProvider } from '../mpesa-provider.js';
import { paymentResponse, validatePaymentInitiation } from '../payment.js';
import { attachProviderReference, createPaymentAttempt } from '../payment-service.js';

export function createInitiateHandler({ db = adminDb, getProvider = getMpesaProvider } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
    try {
      const user = await requireUser(request);
      const input = validatePaymentInitiation(request.body);
      const provider = getProvider();
      const result = await createPaymentAttempt({ db, customerId: user.uid, ...input });
      // A network/provider failure can leave a local pending attempt without a checkout ID.
      // Reuse that attempt on retry, but never issue another STK push once PrintPay returned one.
      if (!result.payment.providerReference) {
        const initiated = await provider.initiateStk({ paymentId: result.payment.paymentId, orderId: result.payment.orderId, amount: result.payment.amount, phone: result.payment.phone, currency: result.payment.currency });
        await attachProviderReference({ db, paymentId: result.payment.paymentId, providerReference: initiated.providerReference });
        result.payment.providerReference = initiated.providerReference;
      }
      return response.status(202).json({ payment: paymentResponse(result.payment) });
    } catch (error) { return sendError(response, error); }
  };
}

export default createInitiateHandler();
