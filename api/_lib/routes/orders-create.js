import { adminDb, requireUser } from '../firebase-admin.js';
import { createOrderHandler } from '../order-create-handler.js';

export { createOrderHandler } from '../order-create-handler.js';
export default createOrderHandler({ db: adminDb, requireAuthenticatedUser: requireUser });
