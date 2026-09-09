import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { createOrderHandler } from '../_lib/order-create-handler.js';

export { createOrderHandler } from '../_lib/order-create-handler.js';
export default createOrderHandler({ db: adminDb, requireAuthenticatedUser: requireUser });
