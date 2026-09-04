import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../_lib/firebase-admin.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(request);
    const displayName = typeof request.body?.displayName === 'string'
      ? request.body.displayName.trim().slice(0, 100)
      : null;
    const reference = adminDb.collection('users').doc(user.uid);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      await reference.set({
        uid: user.uid,
        email: user.email ?? null,
        displayName: displayName || user.name || null,
        phoneNumber: user.phone_number ?? null,
        role: 'CUSTOMER',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      await reference.update({
        email: user.email ?? snapshot.data().email ?? null,
        ...(displayName ? { displayName } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to set up your account.' });
  }
}
