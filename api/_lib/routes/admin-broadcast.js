import { adminDb, requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';
import { emailHtml, sendEmail } from '../email-service.js';

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    await requireAdmin(request);
    const subject = text(request.body?.subject, 160); const message = text(request.body?.message, 5000);
    if (!subject || !message) throw clientError('Provide a subject and message.');
    if (request.body?.audience !== 'MARKETING_CONSENTED') throw clientError('Choose the marketing-consented audience.');
    const users = await adminDb.collection('users').where('marketingConsent', '==', true).get();
    const emails = [...new Set(users.docs.map((doc) => text(doc.data().email, 320).toLowerCase()).filter((email) => email.includes('@')))];
    const htmlContent = emailHtml(subject, message.split('\n').map((line) => line || '&nbsp;').join('<br>'));
    const results = await Promise.allSettled(emails.map((to) => sendEmail({ purpose: 'promotions', to, subject, htmlContent })));
    const sent = results.filter((result) => result.status === 'fulfilled').length;
    if (!sent && emails.length) throw new Error('Brevo could not send the broadcast.');
    return response.status(200).json({ ok: true, audience: 'MARKETING_CONSENTED', recipients: emails.length, sent, failed: emails.length - sent });
  } catch (error) { return sendError(response, error); }
}
