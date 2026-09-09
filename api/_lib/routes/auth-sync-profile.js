import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../firebase-admin.js';
import { normalizeKenyanPhone } from '../phone.js';
import { sendEmail, emailHtml } from '../email-service.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(request);
    const displayName = typeof request.body?.displayName === 'string'
      ? request.body.displayName.trim().slice(0, 100)
      : null;
    const suppliedPhone = request.body?.phoneNumber;
    const phoneNumber = suppliedPhone == null ? null : normalizeKenyanPhone(suppliedPhone);
    if (!phoneNumber && !user.phone_number) return response.status(400).json({ error: 'A valid phone number is required.' });
    const reference = adminDb.collection('users').doc(user.uid);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      await reference.set({
        uid: user.uid,
        email: user.email ?? null,
        displayName: displayName || user.name || null,
        phoneNumber: phoneNumber || normalizeKenyanPhone(user.phone_number),
        marketingConsent: false,
        role: 'CUSTOMER',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      // A welcome message is sent only for the initial profile creation.
      await sendEmail({ purpose: 'hello', to: user.email, subject: 'Welcome to HerStep Collection', htmlContent: emailHtml('Welcome to HerStep', 'Your HerStep Collection account is ready. Step into your style.') });
    } else {
      await reference.update({
        email: user.email ?? snapshot.data().email ?? null,
        ...(displayName ? { displayName } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(typeof request.body?.marketingConsent === 'boolean' ? { marketingConsent: request.body.marketingConsent } : {}),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to set up your account.' });
  }
}
