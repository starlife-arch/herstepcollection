import { clientError } from './http.js';

const BASE_URL = 'https://printpay.site/api';

function providerError(message) { return clientError(message, 502); }

function checkoutId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 180) throw providerError('PrintPay did not return a valid checkout reference.');
  return id;
}

function amount(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw providerError('PrintPay returned an invalid payment amount.');
  return parsed;
}

function callbackStatus({ status, resultCode }) {
  if (String(resultCode) === '0' || String(status).toUpperCase() === 'SUCCESS') return 'PAID';
  if (String(resultCode) === '1032') return 'CANCELLED';
  if (String(resultCode) === '1037') return 'TIMEOUT';
  if (String(status).toUpperCase() === 'PENDING') return 'PENDING';
  return 'FAILED';
}

async function request(url, options, fetchImpl) {
  let response;
  try { response = await fetchImpl(url, options); } catch { throw providerError('PrintPay could not be reached. Please try again shortly.'); }
  let body;
  try { body = await response.json(); } catch { throw providerError('PrintPay returned an invalid response.'); }
  if (!response.ok) throw providerError('PrintPay could not complete the payment request.');
  return body;
}

// PrintPay documents no webhook signature. This adapter does not invent one; successful
// callbacks are independently confirmed with PrintPay's documented status endpoint.
export function createPrintPayProvider({ apiKey = process.env.PRINTPAY_API_KEY, baseUrl = process.env.PRINTPAY_API_BASE_URL || BASE_URL, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) throw clientError('M-Pesa payments are not configured yet. Please contact HerStep Collection.', 503);
  if (typeof fetchImpl !== 'function') throw providerError('The payment service is unavailable.');
  const apiBase = baseUrl.replace(/\/+$/, '');
  return {
    async initiateStk({ phone, amount: paymentAmount }) {
      const form = new URLSearchParams({ x_api_key: apiKey, phone_number: phone, amount: String(paymentAmount) });
      const body = await request(`${apiBase}/stk_push`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form.toString() }, fetchImpl);
      if (String(body.status).toLowerCase() !== 'success') throw providerError('PrintPay did not accept the payment request.');
      return { providerReference: checkoutId(body.checkout_id) };
    },
    async checkStatus(providerReference) {
      const id = checkoutId(providerReference);
      const body = await request(`${apiBase}/stk_push?${new URLSearchParams({ check_status: id })}`, { method: 'GET', headers: { Accept: 'application/json' } }, fetchImpl);
      const status = callbackStatus({ status: body.status, resultCode: body.result_code });
      if (status === 'PENDING') return { providerReference: id, status: 'PENDING' };
      if (status !== 'PAID') throw providerError('PrintPay returned an unknown payment status.');
      return { providerReference: id, status: 'PAID', amount: amount(body.amount), transactionReference: typeof body.mpesa_receipt_number === 'string' ? body.mpesa_receipt_number.trim().slice(0, 180) : null, failureReason: null, eventId: `status:${id}:${body.mpesa_receipt_number || 'success'}` };
    },
    async verifyCallback(request) {
      const body = request.body || {};
      const providerReference = checkoutId(body.checkout_id);
      const status = callbackStatus({ status: body.status, resultCode: body.result_code });
      return { providerReference, status, amount: body.amount == null ? null : amount(body.amount), transactionReference: typeof body.mpesa_receipt === 'string' ? body.mpesa_receipt.trim().slice(0, 180) : null, failureReason: status === 'FAILED' ? `PrintPay result code ${String(body.result_code || 'unknown').slice(0, 40)}` : null, eventId: `callback:${providerReference}:${String(body.result_code || body.status || '').slice(0, 60)}:${String(body.mpesa_receipt || '').slice(0, 80)}` };
    }
  };
}

export function getMpesaProvider() { return createPrintPayProvider(); }
