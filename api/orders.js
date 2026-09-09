import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  'checkout-config': lazyRoute(() => import('./_lib/routes/checkout-config.js')),
  create: lazyRoute(() => import('./_lib/routes/orders-create.js')),
  status: lazyRoute(() => import('./_lib/routes/orders-status.js')),
  track: lazyRoute(() => import('./_lib/routes/orders-track.js'))
});
