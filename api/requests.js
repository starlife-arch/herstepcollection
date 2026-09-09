import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  bulk: lazyRoute(() => import('./_lib/routes/requests-bulk.js')),
  discount: lazyRoute(() => import('./_lib/routes/requests-discount.js'))
});
