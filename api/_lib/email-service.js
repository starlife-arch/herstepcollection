import { FieldValue } from 'firebase-admin/firestore';

const PURPOSES = { hello: 'BREVO_SENDER_HELLO', support: 'BREVO_SENDER_SUPPORT', orders: 'BREVO_SENDER_ORDERS' };

function sender(purpose) {
  const email = process.env[PURPOSES[purpose]];
  if (!email) throw new Error(`Missing required server environment variable: ${PURPOSES[purpose]}`);
  return { email, name: process.env.BREVO_SENDER_NAME || 'HerStep Collection' };
}

export function emailId(key) { return key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 180); }

// This is a transactional outbox: deterministic document ids make state-transition
// retries safe and keep the external side effect outside Firestore transactions.
export function queueEmail(transaction, db, { key, purpose, to, subject, htmlContent }) {
  transaction.create(db.collection('emailOutbox').doc(emailId(key)), { key, purpose, to, subject, htmlContent, status: 'PENDING', createdAt: FieldValue.serverTimestamp() });
}

export async function sendEmail({ purpose, to, subject, htmlContent, fetchImpl = fetch }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('Missing required server environment variable: BREVO_API_KEY');
  const replyTo = process.env.BREVO_REPLY_TO_EMAIL;
  const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: JSON.stringify({ sender: sender(purpose), to: [{ email: to }], ...(replyTo ? { replyTo: { email: replyTo } } : {}), subject, htmlContent }) });
  if (!response.ok) throw new Error('Brevo could not send the email.');
  return response.json();
}

export async function deliverQueuedEmail({ db, key, fetchImpl = fetch }) {
  const reference = db.collection('emailOutbox').doc(emailId(key));
  const snapshot = await reference.get();
  if (!snapshot.exists || snapshot.data().status === 'SENT') return false;
  const email = snapshot.data();
  await sendEmail({ ...email, fetchImpl });
  await reference.update({ status: 'SENT', sentAt: FieldValue.serverTimestamp() });
  return true;
}

export const emailHtml = (title, body) => `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#10233f"><main style="max-width:600px;margin:24px auto;background:#fff;padding:32px;border:1px solid #dce2e8"><p style="letter-spacing:1px;font-size:12px">HERSTEP COLLECTION</p><h1 style="font-size:24px">${title}</h1><p style="font-size:16px;line-height:1.6">${body}</p><p style="font-size:14px;color:#536273">Step Into Your Style.</p></main></body></html>`;
