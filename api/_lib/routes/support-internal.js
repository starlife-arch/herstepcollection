import { adminDb, requireAdmin } from '../firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { clientError, methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return methodNotAllowed(response, 'GET, POST, PATCH');
  try {
    const { user, profile } = await requireAdmin(request); const ticketId = request.query?.ticketId || request.body?.ticketDocumentId;
    if (typeof ticketId !== 'string' || !ticketId) throw clientError('Ticket ID is required.'); const ticket = adminDb.collection('supportTickets').doc(ticketId);
    if (request.method === 'GET') { const notes = await ticket.collection('internalNotes').orderBy('createdAt', 'asc').get(); return response.status(200).json({ notes:notes.docs.map((doc) => ({ id:doc.id, ...doc.data(), createdAt:doc.data().createdAt?.toDate?.().toISOString() || null })) }); }
    if (request.method === 'POST') { const body = typeof request.body?.body === 'string' ? request.body.body.trim().slice(0, 4000) : ''; if (!body) throw clientError('Enter an internal note.'); await ticket.collection('internalNotes').add({ body, authorId:user.uid, authorName:profile.displayName || null, createdAt:FieldValue.serverTimestamp() }); return response.status(201).json({ ok:true }); }
    const assigneeId = typeof request.body?.assigneeId === 'string' ? request.body.assigneeId.trim().slice(0, 128) : null; await ticket.update({ assignedTo:assigneeId, assignedBy:user.uid, updatedAt:FieldValue.serverTimestamp() }); return response.status(200).json({ ok:true });
  } catch (error) { return sendError(response, error); }
}
