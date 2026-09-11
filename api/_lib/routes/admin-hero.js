import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireAdmin } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { normalizeHero, validateHeroSettings } from '../hero.js';

export default async function handler(request, response) {
  if (!['GET', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'GET, PATCH');
  try {
    await requireAdmin(request);
    const reference = adminDb.collection('settings').doc('hero');
    if (request.method === 'GET') return response.status(200).json({ hero: normalizeHero((await reference.get()).data()) });
    const hero = validateHeroSettings(request.body || {});
    await reference.set({ ...hero, updatedAt: FieldValue.serverTimestamp() });
    return response.status(200).json({ ok: true });
  } catch (error) { return sendError(response, error); }
}
