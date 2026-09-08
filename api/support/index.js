import { adminDb, requireUser } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError, clientError } from '../_lib/http.js';
import { createSupportTicket } from '../_lib/support-service.js';
import { ticketResponse } from '../_lib/support.js';
import { enforceRateLimit } from '../_lib/rate-limit.js';

export default async function handler(request, response) {
  try {
    if (request.method === 'POST') {
      const user = await requireUser(request);
      enforceRateLimit(`support-ticket:${user.uid}`, { limit: 5, windowMs: 60_000 });
      const result = await createSupportTicket({ db: adminDb, customerId: user.uid, input: request.body });
      return response.status(201).json({ ticket: ticketResponse(result.ticketDocumentId, result.ticket) });
    }
    if (request.method !== 'GET') return methodNotAllowed(response, 'GET, POST');
    const user = await requireUser(request);
    const requestedStatus = typeof request.query?.status === 'string' ? request.query.status : null;
    if (requestedStatus && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(requestedStatus)) throw clientError('Provide a valid support ticket status.');
    let query = adminDb.collection('supportTickets').where('customerId', '==', user.uid);
    if (requestedStatus) query = query.where('status', '==', requestedStatus);
    const tickets = await query.orderBy('updatedAt', 'desc').limit(50).get();
    return response.status(200).json({ tickets: tickets.docs.map((doc) => ticketResponse(doc.id, doc.data())) });
  } catch (error) { return sendError(response, error); }
}
