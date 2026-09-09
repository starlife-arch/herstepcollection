import { adminDb, requireAdmin } from '../firebase-admin.js';
import { methodNotAllowed, sendError } from '../http.js';
import { buildAdminAnalytics } from '../analytics-service.js';
export default async function handler(request, response) { if (request.method !== 'GET') return methodNotAllowed(response, 'GET'); try { await requireAdmin(request); return response.status(200).json({ analytics: await buildAdminAnalytics({ db: adminDb }) }); } catch (error) { return sendError(response, error); } }
