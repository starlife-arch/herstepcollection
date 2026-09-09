import { clientError, sendError } from './http.js';

/** Dispatch a rewrite-selected endpoint without changing its public URL. */
export async function dispatchRoute(request, response, handlers) {
  const route = Array.isArray(request.query?.route) ? request.query.route[0] : request.query?.route;
  const handler = typeof route === 'string' ? handlers[route] : null;
  if (!handler) return sendError(response, clientError('Endpoint not found.', 404));
  return handler(request, response);
}
