import { adminDb, requireAdmin } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { validatePromotion } from '../../_lib/promotion.js';
import { FieldValue } from 'firebase-admin/firestore';
import { createAuditLog } from '../../_lib/audit.js';

export default async function handler(request, response) {
  if (!['POST', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'POST, PATCH');
  try {
    const { user, profile } = await requireAdmin(request); const promo = validatePromotion(request.body, { requireCode: true }); const ref = adminDb.collection('promoCodes').doc(promo.code);
    await adminDb.runTransaction(async (transaction) => { const existing = request.method === 'PATCH' ? await transaction.get(ref) : null; if (request.method === 'PATCH' && !existing.exists) throw new Error('Promo code not found.'); if (request.method === 'POST') transaction.create(ref, { ...promo, usageCount: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); else transaction.update(ref, { ...promo, updatedAt: FieldValue.serverTimestamp() }); createAuditLog(transaction, adminDb, { admin: { uid: user.uid, name: profile.displayName || null }, action: request.method === 'POST' ? 'PROMO_CODE_CREATED' : 'PROMO_CODE_UPDATED', targetType: 'PROMO_CODE', targetId: promo.code, previous: existing?.data?.() || null, next: promo }); });
    return response.status(request.method === 'POST' ? 201 : 200).json({ promoCode: { ...promo, usageCount: 0 } });
  } catch (error) { return sendError(response, error); }
}
