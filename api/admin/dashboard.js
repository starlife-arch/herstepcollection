import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { createAdminDashboardHandler } from '../_lib/admin-dashboard-handler.js';
import { buildAdminDashboard } from '../_lib/admin-dashboard-service.js';

export default createAdminDashboardHandler({ db: adminDb, requireAdministrator: requireAdmin, buildDashboard: buildAdminDashboard });
