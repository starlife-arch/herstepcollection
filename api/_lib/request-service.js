import { FieldValue } from 'firebase-admin/firestore';
import { clientError } from './http.js';
import { createNotification } from './notification.js';

const REQUEST_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function id(value, label) { const result = text(value, 80); if (!/^[A-Za-z0-9_-]{8,80}$/.test(result)) throw clientError(`Provide a valid ${label}.`); return result; }

export function validateCustomerRequest(input, type) {
  const allowed = type === 'DISCOUNT' ? new Set(['orderDocumentId', 'cart', 'note']) : new Set(['items', 'deliveryLocation', 'note']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) throw clientError('The request contains unsupported fields.');
  const note = text(input.note, 1000); if (!note) throw clientError('Enter a request note.');
  if (type === 'DISCOUNT') {
    const orderDocumentId = input.orderDocumentId ? id(input.orderDocumentId, 'order identifier') : null;
    if (!orderDocumentId && !Array.isArray(input.cart)) throw clientError('Link an order or provide cart details.');
    return { orderDocumentId, cart: Array.isArray(input.cart) ? input.cart.slice(0, 20) : null, note };
  }
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 30) throw clientError('Provide one or more bulk-order items.');
  const items = input.items.map((item) => ({ productId: id(item?.productId, 'product identifier'), size: String(item?.size || ''), quantity: item?.quantity })).map((item) => { if (!/^(35|36|37|38|39|40|41|42)$/.test(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) throw clientError('Bulk-order items are invalid.'); return item; });
  return { items, deliveryLocation: text(input.deliveryLocation, 300) || null, note };
}

export async function createCustomerRequest({ db, customerId, type, input }) {
  const payload = validateCustomerRequest(input, type);
  return db.runTransaction(async (transaction) => {
    if (payload.orderDocumentId) { const order = await transaction.get(db.collection('orders').doc(payload.orderDocumentId)); if (!order.exists) throw clientError('Order not found.', 404); if (order.data().customerId !== customerId) throw clientError('You are not allowed to link that order.', 403); }
    const ref = db.collection(type === 'DISCOUNT' ? 'discountRequests' : 'bulkOrderRequests').doc();
    transaction.create(ref, { ...payload, customerId, type, status: 'PENDING', adminResponse: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { id: ref.id, status: 'PENDING' };
  });
}

export async function updateCustomerRequest({ db, collection, requestId, status, admin }) {
  if (!REQUEST_STATUSES.has(status)) throw clientError('Provide a valid request status.');
  return db.runTransaction(async (transaction) => {
    const ref = db.collection(collection).doc(id(requestId, 'request identifier')); const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw clientError('Request not found.', 404); const request = snapshot.data();
    if (request.status === status) return { duplicate: true, request };
    if (request.status !== 'PENDING') throw clientError('This request has already been reviewed.', 409);
    transaction.update(ref, { status, adminResponse: text(admin.response, 1000) || null, reviewedBy: admin.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    transaction.create(ref.collection('history').doc(`PENDING-${status}`), { previousStatus: 'PENDING', newStatus: status, adminId: admin.uid, adminName: admin.name || null, note: text(admin.response, 1000) || null, createdAt: FieldValue.serverTimestamp() });
    createNotification(transaction, db, { orderDocumentId: requestId, customerId: request.customerId, event: `${request.type}_${status}`, title: `${request.type === 'DISCOUNT' ? 'Discount' : 'Bulk order'} request ${status.toLowerCase()}`, body: text(admin.response, 1000) || 'Your request has been reviewed.' });
    return { duplicate: false, request: { ...request, status } };
  });
}
