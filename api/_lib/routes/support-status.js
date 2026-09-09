import { adminDb, requireAdmin } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { updateSupportTicketStatus } from '../support-service.js';
import { validateTicketStatus } from '../support.js';

export default async function handler(request, response) {
  if (request.method !== 'PATCH') return methodNotAllowed(response, 'PATCH');
  try {
    const { user, profile } = await requireAdmin(request); const { ticketDocumentId, status } = validateTicketStatus(request.body);
    const result = await updateSupportTicketStatus({ db: adminDb, ticketDocumentId, status, admin: { uid: user.uid, name: profile.displayName || null } });
    return response.status(200).json({ ok: true, duplicate: result.duplicate, status: result.ticket.status });
  } catch (error) { return sendError(response, error); }
}
