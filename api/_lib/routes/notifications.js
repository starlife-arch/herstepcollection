import { adminDb, requireUser } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';
import { notificationResponse } from '../customer-data.js';
import { markNotificationRead } from '../notification-service.js';

export default async function handler(request, response) {
  try {
    const user = await requireUser(request);
    if (request.method === 'GET') {
      const snapshot = await adminDb.collection('notifications').where('customerId', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get();
      return response.status(200).json({ notifications: snapshot.docs.map((doc) => notificationResponse(doc.id, doc.data())) });
    }
    if (request.method !== 'PATCH') return methodNotAllowed(response, 'GET, PATCH');
    const notificationId = typeof request.body?.notificationId === 'string' ? request.body.notificationId : '';
    if (!/^[A-Za-z0-9_-]{8,180}$/.test(notificationId)) throw clientError('A valid notification identifier is required.');
    const result = await markNotificationRead({ db: adminDb, customerId: user.uid, notificationId });
    return response.status(200).json({ ok: true, duplicate: result.duplicate, notification: notificationResponse(notificationId, result.notification) });
  } catch (error) { return sendError(response, error); }
}
