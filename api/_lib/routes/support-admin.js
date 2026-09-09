import { adminDb, requireAdmin } from '../firebase-admin.js';
import { createAdminSupportListHandler } from '../support-admin-handler.js';

export default createAdminSupportListHandler({ db: adminDb, requireAdministrator: requireAdmin });
