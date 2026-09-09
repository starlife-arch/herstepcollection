import analytics from './_lib/routes/admin-analytics.js';
import announcement from './_lib/routes/admin-announcement.js';
import auditLogs from './_lib/routes/admin-audit-logs.js';
import brevoContacts from './_lib/routes/admin-brevo-contacts.js';
import dashboard from './_lib/routes/admin-dashboard.js';
import orders from './_lib/routes/admin-orders.js';
import requests from './_lib/routes/admin-requests.js';
import { dispatchRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, { analytics, announcement, 'audit-logs': auditLogs, 'brevo-contacts': brevoContacts, dashboard, orders, requests });
