import { adminDb } from '../_lib/firebase-admin.js';
import { drainQueuedEmails } from '../_lib/email-service.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.authorization !== `Bearer ${secret}`) return response.status(401).json({ error: 'Unauthorized.' });
  try {
    return response.status(200).json({ ok: true, ...(await drainQueuedEmails({ db: adminDb })) });
  } catch (error) {
    return response.status(500).json({ error: 'Email delivery run failed.' });
  }
}
