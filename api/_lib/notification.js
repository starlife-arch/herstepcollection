import { FieldValue } from 'firebase-admin/firestore';

export function notificationId(orderDocumentId, event) { return `${orderDocumentId}-${event}`; }

export function createNotification(transaction, db, { orderDocumentId, customerId, event, title, body }) {
  const reference = db.collection('notifications').doc(notificationId(orderDocumentId, event));
  transaction.create(reference, { customerId, orderDocumentId, event, title, body, readAt: null, createdAt: FieldValue.serverTimestamp() });
}
