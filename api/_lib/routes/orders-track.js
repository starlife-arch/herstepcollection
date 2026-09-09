import { adminDb, requireUser } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';
import { orderTrackingResponse } from '../order-status.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const user = await requireUser(request); const orderDocumentId = typeof request.query?.orderDocumentId === 'string' ? request.query.orderDocumentId : '';
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(orderDocumentId)) throw clientError('A valid order identifier is required.');
    const orderSnapshot = await adminDb.collection('orders').doc(orderDocumentId).get();
    if (!orderSnapshot.exists) throw clientError('Order not found.', 404);
    const order = { ...orderSnapshot.data(), orderDocumentId };
    if (order.customerId !== user.uid) throw clientError('You are not allowed to view this order.', 403);
    const history = await adminDb.collection('orderStatusHistory').where('orderDocumentId', '==', orderDocumentId).orderBy('createdAt').get();
    return response.status(200).json({ order: orderTrackingResponse(order, history.docs.map((doc) => doc.data())) });
  } catch (error) { return sendError(response, error); }
}
