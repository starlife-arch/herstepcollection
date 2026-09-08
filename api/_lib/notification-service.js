import { FieldValue } from 'firebase-admin/firestore';
import { clientError } from './http.js';

export async function markNotificationRead({ db, customerId, notificationId }) {
  return db.runTransaction(async (transaction) => {
    const reference = db.collection('notifications').doc(notificationId); const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw clientError('Notification not found.', 404);
    const notification = snapshot.data();
    if (notification.customerId !== customerId) throw clientError('You are not allowed to update this notification.', 403);
    if (notification.readAt) return { duplicate: true, notification };
    transaction.update(reference, { readAt: FieldValue.serverTimestamp() });
    return { duplicate: false, notification: { ...notification, readAt: new Date() } };
  });
}
