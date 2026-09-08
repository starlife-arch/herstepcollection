import { clientError } from './http.js';

export const SUPPORT_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const TRANSITIONS = {
  OPEN: new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  IN_PROGRESS: new Set(['IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  RESOLVED: new Set(['RESOLVED', 'IN_PROGRESS', 'CLOSED']),
  CLOSED: new Set(['CLOSED'])
};

export function assertTicketTransition(current, next) {
  if (!SUPPORT_STATUSES.has(next) || !TRANSITIONS[current]?.has(next)) throw clientError('The support ticket status transition is invalid.', 409);
}

function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function documentId(value, label) {
  const id = text(value, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) throw clientError(`A valid ${label} is required.`);
  return id;
}

export function validateTicketCreate(input) {
  const allowed = new Set(['subject', 'message', 'orderDocumentId', 'clientMessageId']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) throw clientError('The support request contains unsupported fields.');
  const subject = text(input.subject, 140); const message = text(input.message, 4000);
  if (subject.length < 3) throw clientError('Enter a subject of at least 3 characters.');
  if (!message) throw clientError('Enter a message.');
  return { subject, message, orderDocumentId: input.orderDocumentId == null || input.orderDocumentId === '' ? null : documentId(input.orderDocumentId, 'order identifier'), clientMessageId: documentId(input.clientMessageId, 'message identifier') };
}

export function validateMessageCreate(input) {
  const allowed = new Set(['ticketDocumentId', 'message', 'clientMessageId']);
  if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !allowed.has(key))) throw clientError('The message contains unsupported fields.');
  const message = text(input.message, 4000);
  if (!message) throw clientError('Enter a message.');
  return { ticketDocumentId: documentId(input.ticketDocumentId, 'ticket identifier'), message, clientMessageId: documentId(input.clientMessageId, 'message identifier') };
}

export function validateTicketStatus(input) {
  const ticketDocumentId = documentId(input?.ticketDocumentId, 'ticket identifier');
  if (!SUPPORT_STATUSES.has(input?.status)) throw clientError('Provide a valid support ticket status.');
  return { ticketDocumentId, status: input.status };
}

export function ticketId(sequence) { return `SUP-${String(sequence).padStart(6, '0')}`; }

export function ticketResponse(id, ticket) {
  return { id, ticketId: ticket.ticketId, subject: ticket.subject, status: ticket.status, orderDocumentId: ticket.orderDocumentId || null, customerId: ticket.customerId, lastMessage: ticket.lastMessage || null, lastMessageAt: ticket.lastMessageAt?.toDate?.().toISOString() || null, createdAt: ticket.createdAt?.toDate?.().toISOString() || null, updatedAt: ticket.updatedAt?.toDate?.().toISOString() || null, hasUnreadAdminMessages: ticket.hasUnreadAdminMessages === true };
}

export function messageResponse(id, message) {
  return { id, senderId: message.senderId, senderRole: message.senderRole, body: message.body, createdAt: message.createdAt?.toDate?.().toISOString() || null };
}
