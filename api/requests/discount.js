import { adminDb, requireAdmin, requireUser } from '../_lib/firebase-admin.js';
import { createCustomerRequest, updateCustomerRequest } from '../_lib/request-service.js';
import { createRequestHandler } from '../_lib/request-handler.js';

export default createRequestHandler({ db: adminDb, type: 'DISCOUNT', collection: 'discountRequests', requireUser, requireAdministrator: requireAdmin, createRequest: createCustomerRequest, updateRequest: updateCustomerRequest });
