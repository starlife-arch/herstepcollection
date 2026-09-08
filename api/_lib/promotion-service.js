import { FieldValue } from 'firebase-admin/firestore';
import { clientError } from './http.js';
import { calculatePromoDiscount } from './promotion.js';

export async function applyPromoCode({ transaction, db, code, customerId, lines, subtotal, now = new Date() }) {
  if (!code) return { discount: 0, promoCode: null, promotion: null };
  const promoRef = db.collection('promoCodes').doc(code); const promoSnapshot = await transaction.get(promoRef);
  if (!promoSnapshot.exists) throw clientError('This promo code is invalid.', 404);
  const promo = promoSnapshot.data();
  if (promo.maximumUsage !== null && (promo.usageCount || 0) >= promo.maximumUsage) throw clientError('This promo code has reached its usage limit.', 409);
  const usageRef = db.collection('promoCodeUsages').doc(`${code}_${customerId}`); const usageSnapshot = await transaction.get(usageRef); const usageCount = usageSnapshot.exists ? usageSnapshot.data().usageCount || 0 : 0;
  if (usageCount >= (promo.perCustomerUsage || 1)) throw clientError('You have already used this promo code.', 409);
  const discount = calculatePromoDiscount(promo, lines, subtotal, now);
  transaction.set(usageRef, { code, customerId, usageCount: usageCount + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  transaction.update(promoRef, { usageCount: (promo.usageCount || 0) + 1, updatedAt: FieldValue.serverTimestamp() });
  return { discount, promoCode: code, promotion: { code, name: promo.name, discountType: promo.discountType, discountValue: promo.discountValue } };
}
