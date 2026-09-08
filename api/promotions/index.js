import { adminDb, requireAdmin } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { validatePromotion } from '../../_lib/promotion.js';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') { const now = new Date(); const snapshot = await adminDb.collection('promotions').where('active', '==', true).where('startsAt', '<=', now).orderBy('startsAt', 'desc').limit(50).get(); return response.status(200).json({ promotions: snapshot.docs.filter((doc) => (doc.data().endsAt?.toDate?.() || doc.data().endsAt) >= now).map((doc) => ({ id: doc.id, ...doc.data() })) }); }
    if (!['POST', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'GET, POST, PATCH');
    await requireAdmin(request); const { id, ...input } = request.body || {}; const promotion = validatePromotion(input);
    if (request.method === 'PATCH' && (typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(id))) throw new Error('Provide a valid promotion identifier.');
    const ref = request.method === 'POST' ? adminDb.collection('promotions').doc() : adminDb.collection('promotions').doc(id);
    if (request.method === 'POST') await ref.create({ ...promotion, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); else await ref.update({ ...promotion, updatedAt: FieldValue.serverTimestamp() });
    return response.status(request.method === 'POST' ? 201 : 200).json({ promotion: { id: ref.id, ...promotion } });
  } catch (error) { return sendError(response, error); }
}
