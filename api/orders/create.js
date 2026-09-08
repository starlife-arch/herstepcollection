import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../_lib/http.js';
import { orderId, validateCart, validateCheckout, validateOrderPromotion } from '../_lib/order.js';
import { applyPromoCode } from '../_lib/promotion-service.js';
import { enforceRateLimit } from '../_lib/rate-limit.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    const user = await requireUser(request);
    enforceRateLimit(`order:${user.uid}`, { limit: 5, windowMs: 60_000 });
    const cart = validateCart(request.body?.cart);
    const delivery = validateCheckout(request.body?.delivery || {});
    const promoCode = validateOrderPromotion(request.body);
    const result = await adminDb.runTransaction(async (transaction) => {
      const settingsRef = adminDb.collection('settings').doc('checkout');
      const settingsSnapshot = await transaction.get(settingsRef);
      const settings = settingsSnapshot.data();
      if (!settingsSnapshot.exists || !Number.isInteger(settings.deliveryFee) || settings.deliveryFee < 0 || settings.collectionEnabled !== true || (delivery.deliveryMethod === 'DELIVERY' && settings.deliveryEnabled !== true)) throw clientError('That delivery option is unavailable.');
      const productRefs = cart.map((item) => adminDb.collection('products').doc(item.productId));
      const productSnapshots = await Promise.all(productRefs.map((reference) => transaction.get(reference)));
      const lines = cart.map((item, index) => {
        const snapshot = productSnapshots[index]; const product = snapshot.data();
        if (!snapshot.exists || product.status !== 'ACTIVE') throw clientError('One of the selected products is no longer available.', 409);
        const inventoryIndex = product.inventory?.findIndex((entry) => entry.size === item.size);
        const stock = inventoryIndex === -1 ? null : product.inventory[inventoryIndex];
        if (!stock || stock.quantity < item.quantity) throw clientError(`${product.name} in size ${item.size} no longer has enough stock.`, 409);
        const unitPrice = product.salePrice ?? product.price;
        return { productId: snapshot.id, name: product.name, sku: product.sku, categoryId: product.categoryId || null, size: item.size, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity, image: product.images?.[0]?.url || null, inventoryIndex, product, reference: productRefs[index] };
      });
      const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
      const deliveryFee = delivery.deliveryMethod === 'DELIVERY' ? settings.deliveryFee : 0;
      const promotion = await applyPromoCode({ transaction, db: adminDb, code: promoCode, customerId: user.uid, lines, subtotal });
      const year = new Date().getUTCFullYear();
      const counterRef = adminDb.collection('orderCounters').doc(String(year));
      const counter = await transaction.get(counterRef); const sequence = (counter.data()?.sequence || 0) + 1;
      const reference = adminDb.collection('orders').doc(); const humanOrderId = orderId(year, sequence);
      transaction.set(counterRef, { sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      for (const line of lines) {
        const inventory = line.product.inventory.map((entry, inventoryIndex) => inventoryIndex === line.inventoryIndex ? { ...entry, quantity: entry.quantity - line.quantity } : entry);
        transaction.update(line.reference, { inventory, stockQuantity: line.product.stockQuantity - line.quantity, availableSizes: inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.size), updatedAt: FieldValue.serverTimestamp() });
      }
      const items = lines.map(({ inventoryIndex, product, reference: productReference, ...item }) => item);
      const order = { orderId: humanOrderId, customerId: user.uid, customerEmail: user.email || null, items, subtotal, deliveryFee, discount: promotion.discount, promoCode: promotion.promoCode, promotion: promotion.promotion, total: subtotal + deliveryFee - promotion.discount, currency: 'KES', paymentStatus: 'PENDING', orderStatus: 'PENDING', inventoryReserved: true, delivery, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
      transaction.create(reference, order);
      transaction.create(adminDb.collection('orderStatusHistory').doc(), { orderId: humanOrderId, orderDocumentId: reference.id, customerId: user.uid, previousStatus: null, newStatus: 'PENDING', note: 'Order placed; awaiting payment.', createdAt: FieldValue.serverTimestamp() });
      return { id: reference.id, orderId: humanOrderId, subtotal, deliveryFee, discount: promotion.discount, total: subtotal + deliveryFee - promotion.discount, paymentStatus: 'PENDING', orderStatus: 'PENDING' };
    });
    return response.status(201).json({ order: result });
  } catch (error) { return sendError(response, error); }
}
