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

export const emailHtml = (title, body, options = {}) => {
  const ctaLabel = options.ctaLabel || 'Visit HerStep Collection';
  const ctaUrl = options.ctaUrl || 'https://herstepcollection.com/';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;color:#10233f;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0;background:#f4f6f8;"><tr><td align="center" style="padding:28px 14px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dce2e9;">
      <tr><td style="padding:28px 34px 22px;background:#10233f;">
        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:2px;line-height:1.25;">HERSTEP <span style="color:#d79a6d;">COLLECTION</span></p>
        <p style="margin:7px 0 0;color:#cbd5e1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Step Into Your Style.</p>
      </td></tr>
      <tr><td style="padding:34px;">
        <h1 style="margin:0 0 16px;color:#10233f;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;line-height:1.2;">${title}</h1>
        <div style="color:#40516a;font-size:16px;line-height:1.65;">${body}</div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:27px;"><tr><td style="background:#b96f40;"><a href="${ctaUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:.2px;text-decoration:none;">${ctaLabel}</a></td></tr></table>
      </td></tr>
      <tr><td style="padding:22px 34px;border-top:1px solid #dce2e9;background:#fafbfc;color:#607087;font-size:12px;line-height:1.55;">
        <p style="margin:0 0 7px;color:#10233f;font-weight:700;">HerStep Collection · Juja Town</p>
        <p style="margin:0;">Jerry House, near Juja Posta, Outside Shop No. 12<br><a href="tel:+254799021089" style="color:#10233f;">+254 799 021 089</a> · <a href="mailto:herstepcollection@gmail.com" style="color:#10233f;">herstepcollection@gmail.com</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
};
