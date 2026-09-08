import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../_lib/http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    await requireAdmin(request);
    const snapshot = await adminDb.collection('auditLogs').orderBy('createdAt', 'desc').limit(100).get();
    return response.status(200).json({ auditLogs: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.().toISOString() || null })) });
  } catch (error) { return sendError(response, error); }
}
