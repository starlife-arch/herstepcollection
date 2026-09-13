import { clientError } from './http.js';

export const ORDER_STATUSES = new Set(['PENDING', 'PROCESSING', 'PROCESSED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']);
const TRANSITIONS = {
  PENDING: new Set(['PROCESSING', 'CANCELLED']),
  PROCESSING: new Set(['PROCESSED', 'CANCELLED']),
  PROCESSED: new Set(['OUT_FOR_DELIVERY', 'CANCELLED']),
  OUT_FOR_DELIVERY: new Set(['DELIVERED']),
  DELIVERED: new Set(['DELIVERED']),
  CANCELLED: new Set(['CANCELLED'])
};

export function assertOrderTransition(previousStatus, nextStatus) {
  if (!ORDER_STATUSES.has(nextStatus) || !TRANSITIONS[previousStatus]?.has(nextStatus)) throw clientError('The order status transition is invalid.', 409);
}

export function orderTrackingResponse(order, history) {
  return {
    id: order.orderDocumentId,
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    total: order.total,
    currency: order.currency,
    deliveryMethod: order.delivery?.deliveryMethod || null,
    items: (order.items || []).map(({ productId, name, size, quantity, lineTotal, image, imageUrl }) => ({ productId, name, size, quantity, lineTotal, imageUrl: imageUrl || image || null })),
    history: history.map((entry) => ({ eventType: entry.eventType || 'ORDER_STATUS_CHANGED', previousStatus: entry.previousStatus || null, newStatus: entry.newStatus || null, paymentStatus: entry.paymentStatus || null, note: entry.note || null, source: entry.source || 'SYSTEM', createdAt: entry.createdAt?.toDate?.().toISOString() || null }))
  };
}
