import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  admin: lazyRoute(() => import('./_lib/routes/support-admin.js')),
  messages: lazyRoute(() => import('./_lib/routes/support-messages.js')),
  status: lazyRoute(() => import('./_lib/routes/support-status.js')),
  support: lazyRoute(() => import('./_lib/routes/support.js'))
});
