import admin from './_lib/routes/support-admin.js';
import messages from './_lib/routes/support-messages.js';
import status from './_lib/routes/support-status.js';
import support from './_lib/routes/support.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { admin, messages, status, support });
