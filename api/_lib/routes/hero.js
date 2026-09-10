import { adminDb } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const snapshot = await adminDb.collection('settings').doc('hero').get();
    const hero = snapshot.data();
    return response.status(200).json({ hero: hero?.enabled ? {
      enabled: true, title: hero.title, copy: hero.copy, ctaLabel: hero.ctaLabel,
      ctaUrl: hero.ctaUrl, imageUrl: hero.imageUrl || null, videoUrl: hero.videoUrl || null
    } : null });
  } catch (error) { return sendError(response, error); }
}
