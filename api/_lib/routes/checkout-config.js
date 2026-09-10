import { adminDb } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  try {
    const snapshot = await adminDb.collection('settings').doc('checkout').get();
    // Collection at the published Juja location is always available. Delivery remains
    // opt-in: an absent or invalid admin configuration cannot enable it or set a fee.
    const settings = snapshot.data() || {};
    const deliveryEnabled = settings.deliveryEnabled === true && Number.isInteger(settings.deliveryFee) && settings.deliveryFee >= 0;
    return response.status(200).json({ collectionEnabled: true, deliveryEnabled, deliveryFee: deliveryEnabled ? settings.deliveryFee : null, collectionLocation: 'Juja Town, Jerry House, near Juja Posta, Outside Shop No. 12' });
  } catch (error) { return sendError(response, error); }
}
