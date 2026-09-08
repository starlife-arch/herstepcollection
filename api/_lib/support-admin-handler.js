import { methodNotAllowed, sendError, clientError } from './http.js';
import { ticketResponse } from './support.js';

export function createAdminSupportListHandler({ db, requireAdministrator } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
    try {
      await requireAdministrator(request);
      const status = typeof request.query?.status === 'string' ? request.query.status : null;
      if (status && !['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) throw clientError('Provide a valid support ticket status.');
      let query = db.collection('supportTickets'); if (status) query = query.where('status', '==', status);
      const tickets = await query.orderBy('updatedAt', 'desc').limit(50).get();
      return response.status(200).json({ tickets: tickets.docs.map((doc) => ticketResponse(doc.id, doc.data())) });
    } catch (error) { return sendError(response, error); }
  };
}
