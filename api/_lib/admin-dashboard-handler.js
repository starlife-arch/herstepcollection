import { methodNotAllowed, sendError } from './http.js';

export function createAdminDashboardHandler({ db, requireAdministrator, buildDashboard } = {}) {
  return async function handler(request, response) {
    if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
    try { await requireAdministrator(request); return response.status(200).json({ dashboard: await buildDashboard({ db }) }); } catch (error) { return sendError(response, error); }
  };
}
