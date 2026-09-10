import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  analytics: lazyRoute(() => import('./_lib/routes/admin-analytics.js')),
  announcement: lazyRoute(() => import('./_lib/routes/admin-announcement.js')),
  'audit-logs': lazyRoute(() => import('./_lib/routes/admin-audit-logs.js')),
  'brevo-contacts': lazyRoute(() => import('./_lib/routes/admin-brevo-contacts.js')),
  hero: lazyRoute(() => import('./_lib/routes/admin-hero.js')),
  dashboard: lazyRoute(() => import('./_lib/routes/admin-dashboard.js')),
  orders: lazyRoute(() => import('./_lib/routes/admin-orders.js')),
  requests: lazyRoute(() => import('./_lib/routes/admin-requests.js'))
});
