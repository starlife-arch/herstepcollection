import { adminDb, requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    await requireAdmin(request); const status = typeof request.query?.status === 'string' ? request.query.status : null;
    if (status && !['PENDING', 'PROCESSING', 'PROCESSED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(status)) throw clientError('Provide a valid order status.');
    let query = adminDb.collection('orders'); if (status) query = query.where('orderStatus', '==', status);
    const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
    return response.status(200).json({ orders: snapshot.docs.map((doc) => { const order = doc.data(); return { id: doc.id, orderId: order.orderId, customerId: order.customerId, customerEmail:order.customerEmail || null, items: order.items || [], subtotal:order.subtotal || 0, deliveryFee:order.deliveryFee || 0, discount:order.discount || 0, promoCode:order.promoCode || null, delivery:order.delivery || null, total: order.total, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, createdAt: order.createdAt?.toDate?.().toISOString() || null }; }) });
  } catch (error) { return sendError(response, error); }
}
