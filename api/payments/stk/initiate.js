import { adminDb, requireUser } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { getMpesaProvider } from '../../_lib/mpesa-provider.js';
import { paymentResponse, validatePaymentInitiation } from '../../_lib/payment.js';
import { attachProviderReference, createPaymentAttempt } from '../../_lib/payment-service.js';

export function createInitiateHandler({ db = adminDb, getProvider = getMpesaProvider } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
    try {
      const user = await requireUser(request);
      const input = validatePaymentInitiation(request.body);
      const provider = getProvider();
      const result = await createPaymentAttempt({ db, customerId: user.uid, ...input });
      if (!result.existing) {
        const initiated = await provider.initiateStk({ paymentId: result.payment.paymentId, orderId: result.payment.orderId, amount: result.payment.amount, phone: result.payment.phone, currency: result.payment.currency });
        await attachProviderReference({ db, paymentId: result.payment.paymentId, providerReference: initiated.providerReference });
        result.payment.providerReference = initiated.providerReference;
      }
      return response.status(202).json({ payment: paymentResponse(result.payment) });
    } catch (error) { return sendError(response, error); }
  };
}

export default createInitiateHandler();
