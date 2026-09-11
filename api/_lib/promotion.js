import { clientError } from './http.js';

export const PROMOTION_TYPES = new Set(['PERCENTAGE', 'FIXED']);

function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function ids(value) {
  if (!Array.isArray(value) || value.length > 100 || value.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id))) throw clientError('Promotion product or category identifiers are invalid.');
  return [...new Set(value)];
}
function date(value, label) { const result = new Date(value); if (Number.isNaN(result.valueOf())) throw clientError(`Provide a valid ${label}.`); return result; }
export function normalisePromoCode(value) { const code = clean(value, 40).toUpperCase(); if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) throw clientError('Provide a valid promo code.'); return code; }

export function validatePromotion(input, { requireCode = false } = {}) {
  const allowed = new Set(['code', 'name', 'description', 'active', 'startsAt', 'endsAt', 'discountType', 'discountValue', 'productIds', 'categoryIds', 'minimumOrderValue', 'maximumUsage', 'perCustomerUsage']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) throw clientError('The promotion contains unsupported fields.');
  const name = clean(input.name, 120); const description = clean(input.description, 600); const discountType = input.discountType;
  const discountValue = input.discountValue; const startsAt = date(input.startsAt, 'start date'); const endsAt = date(input.endsAt, 'end date');
  if (name.length < 3) throw clientError('Enter a promotion name with at least 3 characters.');
  if (!PROMOTION_TYPES.has(discountType)) throw clientError('Choose a valid discount type.');
  if (!Number.isInteger(discountValue) || discountValue < 1) throw clientError('Discount value must be a positive whole number.');
  if (discountType === 'PERCENTAGE' && discountValue > 100) throw clientError('Percentage discounts must be between 1 and 100.');
  if (endsAt <= startsAt) throw clientError('Provide valid promotion details: end date must be after the start date.');
  const maximumUsage = input.maximumUsage == null ? null : input.maximumUsage; const perCustomerUsage = input.perCustomerUsage == null ? 1 : input.perCustomerUsage;
  if ((maximumUsage !== null && (!Number.isInteger(maximumUsage) || maximumUsage < 1)) || !Number.isInteger(perCustomerUsage) || perCustomerUsage < 1 || perCustomerUsage > 100 || !Number.isInteger(input.minimumOrderValue || 0) || (input.minimumOrderValue || 0) < 0 || typeof input.active !== 'boolean') throw clientError('Provide valid promotion limits.');
  return { ...(requireCode ? { code: normalisePromoCode(input.code) } : {}), name, description: description || null, active: input.active, startsAt, endsAt, discountType, discountValue, productIds: ids(input.productIds || []), categoryIds: ids(input.categoryIds || []), minimumOrderValue: input.minimumOrderValue || 0, maximumUsage, perCustomerUsage };
}

export function validatePromoCodeInput(value) { return value == null || value === '' ? null : normalisePromoCode(value); }

export function calculatePromoDiscount(promo, lines, subtotal, now = new Date()) {
  const startsAt = promo.startsAt?.toDate?.() || promo.startsAt; const endsAt = promo.endsAt?.toDate?.() || promo.endsAt;
  if (!promo.active || !startsAt || !endsAt || now < startsAt || now > endsAt) throw clientError('This promo code is not currently valid.', 409);
  if (subtotal < promo.minimumOrderValue) throw clientError('This promo code requires a higher order value.', 409);
  const eligible = lines.filter((line) => !promo.productIds?.length && !promo.categoryIds?.length || promo.productIds?.includes(line.productId) || promo.categoryIds?.includes(line.categoryId));
  const eligibleSubtotal = eligible.reduce((sum, line) => sum + line.lineTotal, 0);
  if (!eligibleSubtotal) throw clientError('This promo code does not apply to the selected products.', 409);
  return promo.discountType === 'PERCENTAGE' ? Math.floor(eligibleSubtotal * promo.discountValue / 100) : Math.min(promo.discountValue, eligibleSubtotal);
}
