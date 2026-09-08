import { adminDb, requireAdmin, requireUser } from '../_lib/firebase-admin.js';
import { methodNotAllowed, sendError, clientError } from '../_lib/http.js';
import { createSupportMessage } from '../_lib/support-service.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    const user = await requireUser(request); const admin = await requireAdmin(request).catch((error) => error.statusCode === 403 ? null : Promise.reject(error));
    const result = await createSupportMessage({ db: adminDb, actor: { uid: user.uid, isAdmin: Boolean(admin) }, input: request.body });
    return response.status(201).json({ ok: true, duplicate: result.duplicate, messageId: result.messageId });
  } catch (error) { return sendError(response, error); }
}
