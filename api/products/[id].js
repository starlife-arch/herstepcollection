import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../_lib/http.js';
import { productResponse, validateProduct } from '../_lib/product.js';

export default async function handler(request, response) {
  const id = request.query?.id;
  if (typeof id !== 'string' || !id) return sendError(response, clientError('Product ID is required.'));
  const reference = adminDb.collection('products').doc(id);
  try {
    const snapshot = await reference.get();
    if (!snapshot.exists) throw clientError('Product not found.', 404);
    if (request.method === 'GET') {
      const product = snapshot.data();
      if (product.status !== 'ACTIVE') await requireAdmin(request);
      return response.status(200).json({ product: productResponse(snapshot.id, product) });
    }
    if (request.method !== 'PATCH') return methodNotAllowed(response, 'GET, PATCH');
    const { user } = await requireAdmin(request);
    const product = validateProduct(request.body || {}, snapshot.data());
    const category = await adminDb.collection('categories').doc(product.categoryId).get();
    if (!category.exists || category.data().status !== 'ACTIVE') throw clientError('Choose an active category.');
    const duplicate = await adminDb.collection('products').where('sku', '==', product.sku).limit(1).get();
    if (!duplicate.empty && duplicate.docs[0].id !== id) throw clientError('That SKU already exists.', 409);
    await reference.update({ ...product, updatedBy: user.uid, updatedAt: FieldValue.serverTimestamp() });
    const previousBySize = new Map(snapshot.data().inventory.map((item) => [item.size, item.quantity]));
    const changes = product.inventory
      .filter((item) => previousBySize.get(item.size) !== item.quantity)
      .map((item) => ({ size: item.size, previousQuantity: previousBySize.get(item.size) ?? 0, newQuantity: item.quantity }));
    if (changes.length) {
      await adminDb.collection('inventoryLogs').add({
        productId: id, sku: product.sku, categoryId: product.categoryId, changes,
        adminId: user.uid, reason: typeof request.body?.inventoryReason === 'string' ? request.body.inventoryReason.trim().slice(0, 300) : null,
        createdAt: FieldValue.serverTimestamp()
      });
    }
    return response.status(200).json({ ok: true });
  } catch (error) { return sendError(response, error); }
}
