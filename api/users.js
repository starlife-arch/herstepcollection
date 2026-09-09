import otpRequest from './_lib/routes/auth-otp-request.js';
import otpVerify from './_lib/routes/auth-otp-verify.js';
import syncProfile from './_lib/routes/auth-sync-profile.js';
import dashboard from './_lib/routes/dashboard.js';
import notifications from './_lib/routes/notifications.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { 'otp-request': otpRequest, 'otp-verify': otpVerify, 'sync-profile': syncProfile, dashboard, notifications });
