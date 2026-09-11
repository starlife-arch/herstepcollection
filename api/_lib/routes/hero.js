import { adminDb } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { normalizeHero } from '../hero.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const hero = normalizeHero((await adminDb.collection('settings').doc('hero').get()).data());
    return response.status(200).json({ hero: hero.enabled && hero.slides.length ? hero : null });
  } catch (error) { return sendError(response, error); }
}
