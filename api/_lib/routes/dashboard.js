import { adminDb, requireUser } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { dashboardOrder, notificationResponse } from '../customer-data.js';
import { paymentResponse } from '../payment.js';

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
    const orderRecords = orders.docs.map((doc) => ({ id:doc.id, ...doc.data() }));
    const productIds = [...new Set(orderRecords.flatMap((order) => (order.items || []).filter((item) => !item.imageUrl && !item.image && item.productId).map((item) => item.productId)))];
    const products = await Promise.all(productIds.map(async (productId) => [productId, (await adminDb.collection('products').doc(productId).get()).data()?.images?.[0]?.url || null]));
    const images = new Map(products);
    return response.status(200).json({ dashboard: {
      profile: { displayName: profileData.displayName || null, email: profileData.email || user.email || null, phoneNumber: profileData.phoneNumber || null, deliveryDetails: profileData.deliveryDetails || null },
      orders: orderRecords.map((order) => dashboardOrder(order.id, { ...order, items:(order.items || []).map((item) => ({ ...item, imageUrl:item.imageUrl || item.image || images.get(item.productId) || null })) })),
      payments: payments.docs.map((doc) => paymentResponse(doc.data())),
      notifications: notifications.docs.map((doc) => notificationResponse(doc.id, doc.data()))
    } });
  } catch (error) { return sendError(response, error); }
}
