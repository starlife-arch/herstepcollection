import { clientError, methodNotAllowed, sendError } from './http.js';
import { ORDER_STATUSES } from './order-status.js';

export function createOrderStatusHandler({ db, requireAdministrator, updateStatus } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'PATCH') return methodNotAllowed(response, 'PATCH');
    try {
      const { user, profile } = await requireAdministrator(request);
      const orderDocumentId = typeof request.body?.orderDocumentId === 'string' ? request.body.orderDocumentId.trim() : '';
      const status = request.body?.status;
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(orderDocumentId) || !ORDER_STATUSES.has(status)) throw clientError('Provide a valid order and status.');
      const note = typeof request.body?.note === 'string' ? request.body.note.trim().slice(0, 500) : null;
      const result = await updateStatus({ db, orderDocumentId, status, admin: { uid: user.uid, name: profile.displayName || null, note } });
      return response.status(200).json({ ok: true, duplicate: result.duplicate, orderStatus: result.order.orderStatus });
    } catch (error) { return sendError(response, error); }
  };
}
