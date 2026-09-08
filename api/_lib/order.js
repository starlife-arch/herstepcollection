import { clientError } from './http.js';

const MAX_LINE_QUANTITY = 10;
const MAX_CART_QUANTITY = 20;

export function validateCheckout(input) {
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim().slice(0, 100) : '';
  const rawPhone = typeof input.phone === 'string' ? input.phone.replace(/[\s()-]/g, '') : '';
  const phone = /^0[17]\d{8}$/.test(rawPhone) ? `+254${rawPhone.slice(1)}` : rawPhone;
  const deliveryMethod = input.deliveryMethod;
  const location = typeof input.location === 'string' ? input.location.trim().slice(0, 300) : '';
  const instructions = typeof input.instructions === 'string' ? input.instructions.trim().slice(0, 500) : '';
  if (fullName.length < 2) throw clientError('Enter your full name.');
  if (!/^\+?254[17]\d{8}$/.test(phone)) throw clientError('Enter a valid Kenyan phone number.');
  if (!['COLLECTION', 'DELIVERY'].includes(deliveryMethod)) throw clientError('Choose collection or delivery.');
  if (deliveryMethod === 'DELIVERY' && location.length < 4) throw clientError('Enter a delivery location.');
  return { fullName, phone: phone.startsWith('+') ? phone : `+${phone}`, deliveryMethod, location: deliveryMethod === 'COLLECTION' ? 'Juja Town, Jerry House, near Juja Posta, Outside Shop No. 12' : location, instructions: instructions || null };
}

export function validateCart(cart) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 12) throw clientError('Your cart is empty or invalid.');
  const seen = new Set(); let totalQuantity = 0;
  return cart.map((item) => {
    const productId = typeof item?.productId === 'string' ? item.productId : '';
    const size = String(item?.size ?? ''); const quantity = item?.quantity;
    if (!productId || !/^(35|36|37|38|39|40|41|42)$/.test(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) throw clientError('Your cart contains an invalid item.');
    const key = `${productId}:${size}`;
    if (seen.has(key)) throw clientError('Your cart contains duplicate items.');
    seen.add(key); totalQuantity += quantity;
    return { productId, size, quantity };
  }).map((item) => {
    if (totalQuantity > MAX_CART_QUANTITY) throw clientError(`A maximum of ${MAX_CART_QUANTITY} pairs can be ordered at once.`);
    return item;
  });
}

export function orderId(year, sequence) { return `HS-${year}-${String(sequence).padStart(6, '0')}`; }

export function validateOrderPromotion(input) {
  const code = input?.promoCode;
  if (code == null || code === '') return null;
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{3,40}$/.test(code.trim())) throw clientError('Provide a valid promo code.');
  return code.trim().toUpperCase();
}
