import { clientError } from './http.js';

// This boundary deliberately has no guessed M-Pesa request, callback, or signature format.
// Replace it only after the selected provider supplies its authenticated API documentation.
export function getMpesaProvider() {
  if (!process.env.MPESA_PROVIDER_ADAPTER) {
    throw clientError('M-Pesa payments are not configured yet. Please contact HerStep Collection.', 503);
  }
  throw clientError('The configured M-Pesa provider adapter is not supported by this deployment.', 503);
}
