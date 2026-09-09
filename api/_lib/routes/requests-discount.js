import { adminDb, requireAdmin, requireUser } from '../firebase-admin.js';
import { createCustomerRequest, updateCustomerRequest } from '../request-service.js';
import { createRequestHandler } from '../request-handler.js';

export default createRequestHandler({ db: adminDb, type: 'DISCOUNT', collection: 'discountRequests', requireUser, requireAdministrator: requireAdmin, createRequest: createCustomerRequest, updateRequest: updateCustomerRequest });
