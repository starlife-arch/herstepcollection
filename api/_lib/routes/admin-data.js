import { adminDb, requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    await requireAdmin(request);
    const resource = request.query?.resource;
    if (resource === 'customers') {
      const snapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(100).get();
      return response.status(200).json({ customers: snapshot.docs.map((doc) => { const user = doc.data(); return { id: doc.id, displayName:user.displayName || null, email:user.email || null, phoneNumber:user.phoneNumber || null, deliveryDetails:user.deliveryDetails || null, marketingConsent:user.marketingConsent === true, role:user.role || 'CUSTOMER', createdAt:user.createdAt?.toDate?.().toISOString() || null }; }) });
    }
    if (resource === 'inventory') {
      const [products, logs] = await Promise.all([adminDb.collection('products').orderBy('updatedAt', 'desc').limit(100).get(), adminDb.collection('inventoryLogs').orderBy('createdAt', 'desc').limit(100).get()]);
      return response.status(200).json({ products: products.docs.map((doc) => ({ id:doc.id, name:doc.data().name, sku:doc.data().sku, inventory:doc.data().inventory || [] })), inventoryLogs: logs.docs.map((doc) => ({ id:doc.id, ...doc.data(), createdAt:doc.data().createdAt?.toDate?.().toISOString() || null })) });
    }
    throw clientError('Unknown admin data resource.', 404);
  } catch (error) { return sendError(response, error); }
}
