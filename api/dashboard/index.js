import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../_lib/http.js';
import { dashboardOrder, notificationResponse } from '../_lib/customer-data.js';
import { paymentResponse } from '../_lib/payment.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const user = await requireUser(request);
    const [profile, orders, payments, notifications] = await Promise.all([
      adminDb.collection('users').doc(user.uid).get(),
      adminDb.collection('orders').where('customerId', '==', user.uid).orderBy('createdAt', 'desc').limit(20).get(),
      adminDb.collection('payments').where('customerId', '==', user.uid).orderBy('createdAt', 'desc').limit(20).get(),
      adminDb.collection('notifications').where('customerId', '==', user.uid).orderBy('createdAt', 'desc').limit(20).get()
    ]);
    const profileData = profile.data() || {};
    return response.status(200).json({ dashboard: {
      profile: { displayName: profileData.displayName || null, email: profileData.email || user.email || null, phoneNumber: profileData.phoneNumber || null, deliveryDetails: profileData.deliveryDetails || null },
      orders: orders.docs.map((doc) => dashboardOrder(doc.id, doc.data())),
      payments: payments.docs.map((doc) => paymentResponse(doc.data())),
      notifications: notifications.docs.map((doc) => notificationResponse(doc.id, doc.data()))
    } });
  } catch (error) { return sendError(response, error); }
}
