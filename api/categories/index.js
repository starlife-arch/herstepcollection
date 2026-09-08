import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../_lib/http.js';

function categoryResponse(id, category) {
  return { id, name: category.name, slug: category.slug, status: category.status };
}

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      const snapshot = await adminDb.collection('categories').where('status', '==', 'ACTIVE').orderBy('name').get();
      return response.status(200).json({ categories: snapshot.docs.map((doc) => categoryResponse(doc.id, doc.data())) });
    } catch (error) { return sendError(response, error); }
  }
  if (request.method !== 'POST') return methodNotAllowed(response, 'GET, POST');
  try {
    const { user } = await requireAdmin(request);
    const name = typeof request.body?.name === 'string' ? request.body.name.trim().slice(0, 80) : '';
    const slug = typeof request.body?.slug === 'string' ? request.body.slug.trim().toLowerCase() : '';
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw clientError('Provide a category name and a lowercase hyphenated slug.');
    const reference = adminDb.collection('categories').doc(slug);
    if ((await reference.get()).exists) throw clientError('That category already exists.', 409);
    await reference.set({ name, slug, status: 'ACTIVE', createdBy: user.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return response.status(201).json({ category: { id: slug, name, slug, status: 'ACTIVE' } });
  } catch (error) { return sendError(response, error); }
}
