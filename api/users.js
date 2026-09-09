import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  'otp-request': lazyRoute(() => import('./_lib/routes/auth-otp-request.js')),
  'otp-verify': lazyRoute(() => import('./_lib/routes/auth-otp-verify.js')),
  'sync-profile': lazyRoute(() => import('./_lib/routes/auth-sync-profile.js')),
  dashboard: lazyRoute(() => import('./_lib/routes/dashboard.js')),
  notifications: lazyRoute(() => import('./_lib/routes/notifications.js'))
});
