import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { createAdminSupportListHandler } from '../_lib/support-admin-handler.js';

export default createAdminSupportListHandler({ db: adminDb, requireAdministrator: requireAdmin });
