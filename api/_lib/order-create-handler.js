import { FieldValue } from 'firebase-admin/firestore';
import { clientError, methodNotAllowed, sendError } from './http.js';
import { orderId, validateCart, validateCheckout, validateOrderPromotion } from './order.js';
import { applyPromoCode } from './promotion-service.js';
import { enforceRateLimit } from './rate-limit.js';
import { queueEmail, emailHtml } from './email-service.js';

export function createOrderHandler({ db, requireAuthenticatedUser } = {}) { return async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    const user = await requireAuthenticatedUser(request);
    enforceRateLimit(`order:${user.uid}`, { limit: 5, windowMs: 60_000 });
    const cart = validateCart(request.body?.cart);
    const delivery = validateCheckout(request.body?.delivery || {});
    const promoCode = validateOrderPromotion(request.body);
    const result = await db.runTransaction(async (transaction) => {
      const settingsRef = db.collection('settings').doc('checkout');
      const settingsSnapshot = await transaction.get(settingsRef);
      const configuredSettings = settingsSnapshot.data() || {};
      // In-store collection is a fixed business capability, not a browser setting.
      // Delivery is enabled only by a valid administrator configuration.
      const deliveryEnabled = configuredSettings.deliveryEnabled === true
        && Number.isInteger(configuredSettings.deliveryFee)
        && configuredSettings.deliveryFee >= 0;
      const settings = { deliveryEnabled, deliveryFee: deliveryEnabled ? configuredSettings.deliveryFee : 0 };
      if (delivery.deliveryMethod === 'DELIVERY' && !deliveryEnabled) throw clientError('That delivery option is unavailable.');
      const productRefs = cart.map((item) => db.collection('products').doc(item.productId));
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
      const year = new Date().getUTCFullYear();
      const counterRef = db.collection('orderCounters').doc(String(year));
      // Firestore requires every transaction read to finish before its first write.
      // applyPromoCode writes usage counters, so load this counter first.
      const counter = await transaction.get(counterRef); const sequence = (counter.data()?.sequence || 0) + 1;
      const promotion = await applyPromoCode({ transaction, db, code: promoCode, customerId: user.uid, lines, subtotal });
      const reference = db.collection('orders').doc(); const humanOrderId = orderId(year, sequence);
      transaction.set(counterRef, { sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      for (const line of lines) {
        const inventory = line.product.inventory.map((entry, inventoryIndex) => inventoryIndex === line.inventoryIndex ? { ...entry, quantity: entry.quantity - line.quantity } : entry);
        transaction.update(line.reference, { inventory, stockQuantity: line.product.stockQuantity - line.quantity, availableSizes: inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.size), updatedAt: FieldValue.serverTimestamp() });
      }
      const items = lines.map(({ inventoryIndex, product, reference: productReference, ...item }) => item);
      const order = { orderId: humanOrderId, customerId: user.uid, customerEmail: user.email || null, items, subtotal, deliveryFee, discount: promotion.discount, promoCode: promotion.promoCode, promotion: promotion.promotion, total: subtotal + deliveryFee - promotion.discount, currency: 'KES', paymentStatus: 'PENDING', orderStatus: 'PENDING', inventoryReserved: true, delivery, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
      transaction.create(reference, order);
      transaction.create(db.collection('orderStatusHistory').doc(), { orderId: humanOrderId, orderDocumentId: reference.id, customerId: user.uid, previousStatus: null, newStatus: 'PENDING', note: 'Order placed; awaiting payment.', createdAt: FieldValue.serverTimestamp() });
      if (user.email) queueEmail(transaction, db, { key: `${reference.id}-ORDER_CREATED`, purpose: 'orders', to: user.email, subject: `Order ${humanOrderId} confirmed`, htmlContent: emailHtml('Order confirmed', `We received your order <strong>${humanOrderId}</strong>. Payment is pending.`) });
      return { id: reference.id, orderId: humanOrderId, subtotal, deliveryFee, discount: promotion.discount, total: subtotal + deliveryFee - promotion.discount, paymentStatus: 'PENDING', orderStatus: 'PENDING' };
    });
    return response.status(201).json({ order: result });
  } catch (error) { return sendError(response, error); }
}; }
