import { adminDb } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';
import { productResponse, validateProduct } from '../product.js';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin } from '../firebase-admin.js';

const PAGE_SIZE = 36;

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      // An authenticated administrator gets the complete catalogue (including drafts and
      // archived products); public visitors can only ever receive active products.
      const hasBearerToken = /^Bearer\s+/i.test(request.headers?.authorization || '');
      if (hasBearerToken) {
        await requireAdmin(request);
        const snapshot = await adminDb.collection('products').orderBy('createdAt', 'desc').limit(100).get();
        return response.status(200).json({ products: snapshot.docs.map((doc) => productResponse(doc.id, doc.data())), nextPage: null });
      }
      const snapshot = await adminDb.collection('products').where('status', '==', 'ACTIVE').orderBy('createdAt', 'desc').limit(PAGE_SIZE).get();
      return response.status(200).json({ products: snapshot.docs.map((doc) => productResponse(doc.id, doc.data())), nextPage: null });
    } catch (error) { return sendError(response, error); }
  }
  if (request.method !== 'POST') return methodNotAllowed(response, 'GET, POST');
  try {
    const { user } = await requireAdmin(request);
    const product = validateProduct(request.body || {});
    const category = await adminDb.collection('categories').doc(product.categoryId).get();
    if (!category.exists || category.data().status !== 'ACTIVE') throw clientError('Choose an active category.');
    const duplicate = await adminDb.collection('products').where('sku', '==', product.sku).limit(1).get();
    if (!duplicate.empty) throw clientError('That SKU already exists.', 409);
    const reference = adminDb.collection('products').doc();
    await reference.set({ ...product, createdBy: user.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    const created = await reference.get();
    return response.status(201).json({ product: productResponse(reference.id, created.data()) });
  } catch (error) { return sendError(response, error); }
}
