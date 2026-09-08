import { adminDb } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { getMpesaProvider } from '../../_lib/mpesa-provider.js';
import { applyVerifiedCallback } from '../../_lib/payment-service.js';

export function createCallbackHandler({ db = adminDb, getProvider = getMpesaProvider } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
    try {
      const provider = getProvider();
      // The adapter must authenticate this exact request and normalize only verified callback data.
      const callback = await provider.verifyCallback(request);
      const result = await applyVerifiedCallback({ db, callback });
      return response.status(200).json({ ok: true, duplicate: result.duplicate });
    } catch (error) { return sendError(response, error); }
  };
}

export default createCallbackHandler();
