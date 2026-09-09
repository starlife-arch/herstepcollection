import { adminDb, requireAdmin } from '../firebase-admin.js';
import { createAdminDashboardHandler } from '../admin-dashboard-handler.js';
import { buildAdminDashboard } from '../admin-dashboard-service.js';

export default createAdminDashboardHandler({ db: adminDb, requireAdministrator: requireAdmin, buildDashboard: buildAdminDashboard });
