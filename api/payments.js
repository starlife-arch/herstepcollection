import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  callback: lazyRoute(() => import('./_lib/routes/payments-mpesa-callback.js')),
  receipt: lazyRoute(() => import('./_lib/routes/payments-receipt.js')),
  status: lazyRoute(() => import('./_lib/routes/payments-status.js')),
  initiate: lazyRoute(() => import('./_lib/routes/payments-stk-initiate.js'))
});
