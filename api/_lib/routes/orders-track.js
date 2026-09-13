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
    const productIds = [...new Set((order.items || []).filter((item) => !item.imageUrl && !item.image && item.productId).map((item) => item.productId))];
    const products = await Promise.all(productIds.map(async (productId) => [productId, (await adminDb.collection('products').doc(productId).get()).data()?.images?.[0]?.url || null]));
    const images = new Map(products);
    order.items = (order.items || []).map((item) => ({ ...item, imageUrl: item.imageUrl || item.image || images.get(item.productId) || null }));
    return response.status(200).json({ order: orderTrackingResponse(order, history.docs.map((doc) => doc.data())) });
  } catch (error) { return sendError(response, error); }
}
