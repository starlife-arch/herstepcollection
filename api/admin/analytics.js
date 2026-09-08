import { adminDb, requireAdmin } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError } from '../_lib/http.js';
import { buildAdminAnalytics } from '../_lib/analytics-service.js';
export default async function handler(request, response) { if (request.method !== 'GET') return methodNotAllowed(response, 'GET'); try { await requireAdmin(request); return response.status(200).json({ analytics: await buildAdminAnalytics({ db: adminDb }) }); } catch (error) { return sendError(response, error); } }
