import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../_lib/http.js';
import { validatePromotion } from '../_lib/promotion.js';
import { FieldValue } from 'firebase-admin/firestore';
import { createAuditLog } from '../_lib/audit.js';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') { const now = new Date(); const snapshot = await adminDb.collection('promotions').where('active', '==', true).where('startsAt', '<=', now).orderBy('startsAt', 'desc').limit(50).get(); response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120'); return response.status(200).json({ promotions: snapshot.docs.filter((doc) => (doc.data().endsAt?.toDate?.() || doc.data().endsAt) >= now).map((doc) => ({ id: doc.id, ...doc.data() })) }); }
    if (!['POST', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'GET, POST, PATCH');
    const { user, profile } = await requireAdmin(request); const { id, ...input } = request.body || {}; const promotion = validatePromotion(input);
    if (request.method === 'PATCH' && (typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(id))) throw new Error('Provide a valid promotion identifier.');
    const ref = request.method === 'POST' ? adminDb.collection('promotions').doc() : adminDb.collection('promotions').doc(id);
    await adminDb.runTransaction(async (transaction) => {
      const existing = request.method === 'PATCH' ? await transaction.get(ref) : null;
      if (request.method === 'PATCH' && !existing.exists) throw new Error('Promotion not found.');
      if (request.method === 'POST') transaction.create(ref, { ...promotion, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); else transaction.update(ref, { ...promotion, updatedAt: FieldValue.serverTimestamp() });
      createAuditLog(transaction, adminDb, { admin: { uid: user.uid, name: profile.displayName || null }, action: request.method === 'POST' ? 'PROMOTION_CREATED' : 'PROMOTION_UPDATED', targetType: 'PROMOTION', targetId: ref.id, previous: existing?.data?.() || null, next: promotion });
    });
    return response.status(request.method === 'POST' ? 201 : 200).json({ promotion: { id: ref.id, ...promotion } });
  } catch (error) { return sendError(response, error); }
}
