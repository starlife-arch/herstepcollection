import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const httpsUrl = (value) => !value || (typeof value === 'string' && /^https:\/\//.test(value));

export default async function handler(request, response) {
  if (request.method !== 'PATCH') return methodNotAllowed(response, 'PATCH');
  try {
    await requireAdmin(request);
    const { enabled, title, copy, ctaLabel, ctaUrl, imageUrl, videoUrl } = request.body || {};
    if (typeof enabled !== 'boolean' || !text(title, 160) || !text(copy, 500) || !text(ctaLabel, 80) || !/^(?:#[^\s]*|\/(?:[^\s]*)|https:\/\/[^\s]+)$/.test(ctaUrl || '') || !httpsUrl(imageUrl) || !httpsUrl(videoUrl)) {
      throw clientError('Provide valid hero content and secure media URLs.');
    }
    await adminDb.collection('settings').doc('hero').set({ enabled, title: text(title, 160), copy: text(copy, 500), ctaLabel: text(ctaLabel, 80), ctaUrl: ctaUrl.trim(), imageUrl: imageUrl || null, videoUrl: videoUrl || null, updatedAt: FieldValue.serverTimestamp() });
    return response.status(200).json({ ok: true });
  } catch (error) { return sendError(response, error); }
}
