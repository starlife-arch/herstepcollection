import { adminDb, requireAdmin } from '../../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../../_lib/http.js';
import { validatePromotion } from '../../_lib/promotion.js';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(request, response) {
  if (!['POST', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'POST, PATCH');
  try {
    await requireAdmin(request); const promo = validatePromotion(request.body, { requireCode: true }); const ref = adminDb.collection('promoCodes').doc(promo.code);
    if (request.method === 'POST') await ref.create({ ...promo, usageCount: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); else await ref.update({ ...promo, updatedAt: FieldValue.serverTimestamp() });
    return response.status(request.method === 'POST' ? 201 : 200).json({ promoCode: { ...promo, usageCount: 0 } });
  } catch (error) { return sendError(response, error); }
}
