import { adminDb, requireAdmin } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';

function requestResponse(id, request) { return { id, customerId: request.customerId, note: request.note, orderDocumentId:request.orderDocumentId || null, cart:request.cart || null, items:request.items || null, deliveryLocation:request.deliveryLocation || null, createdAt: request.createdAt?.toDate?.().toISOString() || null }; }
export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try { await requireAdmin(request); const [discounts, bulk] = await Promise.all([adminDb.collection('discountRequests').where('status', '==', 'PENDING').orderBy('createdAt', 'desc').limit(25).get(), adminDb.collection('bulkOrderRequests').where('status', '==', 'PENDING').orderBy('createdAt', 'desc').limit(25).get()]); return response.status(200).json({ discountRequests: discounts.docs.map((doc) => requestResponse(doc.id, doc.data())), bulkRequests: bulk.docs.map((doc) => requestResponse(doc.id, doc.data())) }); } catch (error) { return sendError(response, error); }
}
