import { requireAdmin, adminDb } from '../_lib/firebase-admin.js';
import { createOrderStatusHandler } from '../_lib/order-status-handler.js';
import { updateOrderStatus } from '../_lib/order-status-service.js';

// requireAdmin verifies the Firebase token and reads the trusted users/{uid} role;
// no request-body field can grant administrative access.
export default createOrderStatusHandler({ db: adminDb, requireAdministrator: requireAdmin, updateStatus: updateOrderStatus });
