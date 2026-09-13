import { adminDb, requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    await requireAdmin(request); const status = typeof request.query?.status === 'string' ? request.query.status : null;
    if (status && !['PENDING', 'PROCESSING', 'PROCESSED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(status)) throw clientError('Provide a valid order status.');
    let query = adminDb.collection('orders'); if (status) query = query.where('orderStatus', '==', status);
    const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const productIds = [...new Set(orders.flatMap((order) => (order.items || []).filter((item) => !item.imageUrl && !item.image && item.productId).map((item) => item.productId)))];
    const products = await Promise.all(productIds.map(async (productId) => [productId, (await adminDb.collection('products').doc(productId).get()).data()?.images?.[0]?.url || null]));
    const images = new Map(products);
    return response.status(200).json({ orders: orders.map((order) => ({ id: order.id, orderId: order.orderId, customerId: order.customerId, customerEmail:order.customerEmail || null, items: (order.items || []).map((item) => ({ ...item, imageUrl: item.imageUrl || item.image || images.get(item.productId) || null })), subtotal:order.subtotal || 0, deliveryFee:order.deliveryFee || 0, discount:order.discount || 0, promoCode:order.promoCode || null, delivery:order.delivery || null, total: order.total, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, createdAt: order.createdAt?.toDate?.().toISOString() || null })) });
  } catch (error) { return sendError(response, error); }
}
