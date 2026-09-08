import { methodNotAllowed, sendError } from './http.js';

export function createRequestHandler({ db, type, collection, requireUser, requireAdministrator, createRequest, updateRequest } = {}) {
  return async function handler(request, response) {
    try {
      if (request.method === 'POST') { const user = await requireUser(request); return response.status(201).json({ request: await createRequest({ db, customerId: user.uid, type, input: request.body }) }); }
      if (request.method !== 'PATCH') return methodNotAllowed(response, 'POST, PATCH');
      const { user, profile } = await requireAdministrator(request); const result = await updateRequest({ db, collection, requestId: request.body?.requestId, status: request.body?.status, admin: { uid: user.uid, name: profile.displayName, response: request.body?.response } });
      return response.status(200).json({ ok: true, duplicate: result.duplicate, status: result.request.status });
    } catch (error) { return sendError(response, error); }
  };
}
