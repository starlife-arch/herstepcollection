import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireAdmin } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { normalizeDelivery, validateDelivery } from '../delivery.js';
export default async function handler(request, response) { if (!['GET','PATCH'].includes(request.method)) return methodNotAllowed(response, 'GET, PATCH'); try { await requireAdmin(request); const ref = adminDb.collection('settings').doc('checkout'); if (request.method === 'GET') return response.status(200).json({ delivery:normalizeDelivery((await ref.get()).data()) }); const delivery = validateDelivery(request.body || {}); await ref.set({ ...delivery, updatedAt:FieldValue.serverTimestamp() }, { merge:true }); return response.status(200).json({ delivery }); } catch (error) { return sendError(response, error); } }
