import { FieldValue } from 'firebase-admin/firestore';
import { clientError } from './http.js';
import { assertTicketTransition, ticketId, validateMessageCreate, validateTicketCreate } from './support.js';
import { createNotification } from './notification.js';
import { createAuditLog } from './audit.js';
import { deliverQueuedEmailInline, queueEmail, emailHtml } from './email-service.js';

async function getOwnedTicket(transaction, db, ticketDocumentId, actor) {
  const reference = db.collection('supportTickets').doc(ticketDocumentId); const snapshot = await transaction.get(reference);
  if (!snapshot.exists) throw clientError('Support ticket not found.', 404);
  const ticket = snapshot.data();
  if (!actor.isAdmin && ticket.customerId !== actor.uid) throw clientError('You are not allowed to access this support ticket.', 403);
  return { reference, ticket };
}

export async function createSupportTicket({ db, customerId, input }) {
  const ticketInput = validateTicketCreate(input);
  const result = await db.runTransaction(async (transaction) => {
    const customer = await transaction.get(db.collection('users').doc(customerId));
    if (ticketInput.orderDocumentId) {
      const order = await transaction.get(db.collection('orders').doc(ticketInput.orderDocumentId));
      if (!order.exists) throw clientError('The selected order was not found.', 404);
      if (order.data().customerId !== customerId) throw clientError('You are not allowed to link that order.', 403);
    }
    const counterRef = db.collection('counters').doc('supportTickets'); const counterSnapshot = await transaction.get(counterRef);
    const sequence = (counterSnapshot.exists ? counterSnapshot.data().sequence : 0) + 1;
    const ticketRef = db.collection('supportTickets').doc(); const messageRef = ticketRef.collection('messages').doc(ticketInput.clientMessageId);
    const ticket = { ticketId: ticketId(sequence), customerId, subject: ticketInput.subject, orderDocumentId: ticketInput.orderDocumentId, status: 'OPEN', lastMessage: ticketInput.message, lastMessageAt: FieldValue.serverTimestamp(), lastMessageSenderRole: 'CUSTOMER', hasUnreadAdminMessages: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
    transaction.set(counterRef, { sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.create(ticketRef, ticket);
    transaction.create(messageRef, { senderId: customerId, senderRole: 'CUSTOMER', body: ticketInput.message, createdAt: FieldValue.serverTimestamp() });
    const emailKey = customer.exists && customer.data().email ? `${ticketRef.id}-CREATED` : null;
    if (emailKey) queueEmail(transaction, db, { key: emailKey, purpose: 'support', to: customer.data().email, subject: `Support ticket ${ticket.ticketId} created`, htmlContent: emailHtml('Support request received', `Your support ticket <strong>${ticket.ticketId}</strong> has been created.`) });
    return { ticketDocumentId: ticketRef.id, ticket, emailKey };
  });
  if (result.emailKey) await deliverQueuedEmailInline({ db, key: result.emailKey });
  delete result.emailKey;
  return result;
}

export async function createSupportMessage({ db, actor, input }) {
  const messageInput = validateMessageCreate(input);
  return db.runTransaction(async (transaction) => {
    const { reference: ticketRef, ticket } = await getOwnedTicket(transaction, db, messageInput.ticketDocumentId, actor);
    if (ticket.status === 'CLOSED') throw clientError('This support ticket has been closed.', 409);
    const messageRef = ticketRef.collection('messages').doc(messageInput.clientMessageId); const existing = await transaction.get(messageRef);
    if (existing.exists) {
      const saved = existing.data();
      if (saved.senderId !== actor.uid || saved.senderRole !== (actor.isAdmin ? 'ADMIN' : 'CUSTOMER')) throw clientError('This message identifier is already in use.', 409);
      return { duplicate: true, ticket, message: saved, messageId: messageRef.id };
    }
    const senderRole = actor.isAdmin ? 'ADMIN' : 'CUSTOMER';
    const message = { senderId: actor.uid, senderRole, body: messageInput.message, createdAt: FieldValue.serverTimestamp() };
    transaction.create(messageRef, message);
    transaction.update(ticketRef, { lastMessage: message.body, lastMessageAt: FieldValue.serverTimestamp(), lastMessageSenderRole: senderRole, hasUnreadAdminMessages: senderRole === 'CUSTOMER', updatedAt: FieldValue.serverTimestamp() });
    if (senderRole === 'ADMIN') createNotification(transaction, db, { orderDocumentId: messageInput.ticketDocumentId, customerId: ticket.customerId, event: `SUPPORT_REPLY_${messageRef.id}`, title: 'Support reply', body: `HerStep support replied to ticket ${ticket.ticketId}.` });
    return { duplicate: false, ticket, message, messageId: messageRef.id };
  });
}

export async function updateSupportTicketStatus({ db, ticketDocumentId, status, admin }) {
  const result = await db.runTransaction(async (transaction) => {
    const { reference, ticket } = await getOwnedTicket(transaction, db, ticketDocumentId, { uid: admin.uid, isAdmin: true });
    const customer = status === 'CLOSED' ? await transaction.get(db.collection('users').doc(ticket.customerId)) : null;
    if (ticket.status === status) return { duplicate: true, ticket };
    assertTicketTransition(ticket.status, status);
    transaction.update(reference, { status, updatedAt: FieldValue.serverTimestamp(), statusUpdatedBy: admin.uid, statusUpdatedAt: FieldValue.serverTimestamp() });
    transaction.create(reference.collection('history').doc(`${ticket.status}-${status}`), { previousStatus: ticket.status, newStatus: status, adminId: admin.uid, adminName: admin.name || null, createdAt: FieldValue.serverTimestamp() });
    if (status === 'CLOSED') createNotification(transaction, db, { orderDocumentId: ticketDocumentId, customerId: ticket.customerId, event: 'SUPPORT_CLOSED', title: 'Support ticket closed', body: `Support ticket ${ticket.ticketId} has been closed.` });
    const emailKey = customer?.exists && customer.data().email ? `${ticketDocumentId}-CLOSED` : null;
    if (emailKey) queueEmail(transaction, db, { key: emailKey, purpose: 'support', to: customer.data().email, subject: `Support ticket ${ticket.ticketId} closed`, htmlContent: emailHtml('Support ticket closed', `Your ticket <strong>${ticket.ticketId}</strong> has been closed. Please contact us if you need further help.`) });
    createAuditLog(transaction, db, { admin, action: 'SUPPORT_STATUS_CHANGED', targetType: 'SUPPORT_TICKET', targetId: ticketDocumentId, previous: { status: ticket.status }, next: { status } });
    return { duplicate: false, ticket: { ...ticket, status }, emailKey };
  });
  if (result.emailKey) await deliverQueuedEmailInline({ db, key: result.emailKey });
  delete result.emailKey;
  return result;
}
