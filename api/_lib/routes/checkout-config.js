import { adminDb } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const snapshot = await adminDb.collection('settings').doc('checkout').get();
    const settings = snapshot.data();
    if (!snapshot.exists || !Number.isInteger(settings.deliveryFee) || settings.deliveryFee < 0 || settings.collectionEnabled !== true) {
      return response.status(503).json({ error: 'Checkout is temporarily unavailable. Please contact HerStep Collection.' });
    }
    return response.status(200).json({ collectionEnabled: true, deliveryEnabled: settings.deliveryEnabled === true, deliveryFee: settings.deliveryEnabled === true ? settings.deliveryFee : null, collectionLocation: 'Juja Town, Jerry House, near Juja Posta, Outside Shop No. 12' });
  } catch (error) { return sendError(response, error); }
}
