import { FieldValue } from 'firebase-admin/firestore';
import { clientError } from './http.js';
import { createNotification } from './notification.js';
import { createAuditLog } from './audit.js';
import { assertOrderTransition } from './order-status.js';
import { deliverQueuedEmailInline, queueEmail, emailHtml } from './email-service.js';

export async function updateOrderStatus({ db, orderDocumentId, status, admin }) {
  const result = await db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderDocumentId); const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw clientError('Order not found.', 404);
    const order = snapshot.data();
    if (order.orderStatus === status) return { duplicate: true, order };
    if (status === 'PROCESSING' && order.paymentStatus !== 'PAID') throw clientError('Only paid orders can enter processing.', 409);
    assertOrderTransition(order.orderStatus, status);
    transaction.update(orderRef, { orderStatus: status, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(db.collection('orderStatusHistory').doc(`${orderDocumentId}-${status}`), { orderId: order.orderId, orderDocumentId, customerId: order.customerId, eventType: 'ORDER_STATUS_CHANGED', previousStatus: order.orderStatus, newStatus: status, note: admin.note || null, source: 'ADMIN', adminId: admin.uid, adminName: admin.name || null, createdAt: FieldValue.serverTimestamp() });
    const messages = { PROCESSING: ['Order processing', 'Your HerStep order is now being prepared.'], PROCESSED: ['Order prepared', 'Your HerStep order has been prepared.'], OUT_FOR_DELIVERY: ['Order out for delivery', 'Your HerStep order is on its way.'], DELIVERED: ['Order delivered', 'Your HerStep order has been delivered.'], CANCELLED: ['Order cancelled', 'Your HerStep order has been cancelled.'] };
    const [title, body] = messages[status];
    createNotification(transaction, db, { orderDocumentId, customerId: order.customerId, event: `ORDER_${status}`, title, body });
    const emailKey = order.customerEmail ? `${orderDocumentId}-ORDER_${status}` : null;
    if (emailKey) queueEmail(transaction, db, { key: emailKey, purpose: 'orders', to: order.customerEmail, subject: title, htmlContent: emailHtml(title, `${body} Order <strong>${order.orderId}</strong>.`) });
    createAuditLog(transaction, db, { admin, action: 'ORDER_STATUS_CHANGED', targetType: 'ORDER', targetId: orderDocumentId, previous: { orderStatus: order.orderStatus }, next: { orderStatus: status } });
    return { duplicate: false, order: { ...order, orderStatus: status }, emailKey };
  });
  if (result.emailKey) await deliverQueuedEmailInline({ db, key: result.emailKey });
  delete result.emailKey;
  return result;
}
