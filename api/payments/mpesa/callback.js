import { adminDb } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { getMpesaProvider } from '../../_lib/mpesa-provider.js';
import { applyVerifiedCallback } from '../../_lib/payment-service.js';

export function createCallbackHandler({ db = adminDb, getProvider = getMpesaProvider } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
    try {
      const provider = getProvider();
      const callback = await provider.verifyCallback(request);
      if (callback.status === 'PENDING') return response.status(200).json({ ok: true, pending: true });
      // PrintPay documents no callback signature. Its status API is therefore the source of
      // truth for success before any PAID state can be committed.
      if (callback.status === 'PAID') {
        const checked = await provider.checkStatus(callback.providerReference);
        if (checked.status !== 'PAID') throw Object.assign(new Error('PrintPay has not verified this payment as successful.'), { statusCode: 409 });
        if (checked.providerReference !== callback.providerReference) throw Object.assign(new Error('PrintPay checkout reference did not match.'), { statusCode: 409 });
        Object.assign(callback, checked, { eventId: callback.eventId });
      }
      const result = await applyVerifiedCallback({ db, callback });
      return response.status(200).json({ ok: true, duplicate: result.duplicate });
    } catch (error) { return sendError(response, error); }
  };
}

export default createCallbackHandler();
