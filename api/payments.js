import callback from './_lib/routes/payments-mpesa-callback.js';
import receipt from './_lib/routes/payments-receipt.js';
import status from './_lib/routes/payments-status.js';
import initiate from './_lib/routes/payments-stk-initiate.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { callback, receipt, status, initiate });
