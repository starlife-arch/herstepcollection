import { clientError, sendError } from './http.js';

/** Creates a lazily imported endpoint definition for a grouped Vercel function. */
export function lazyRoute(load) {
  return { load };
}

/** Dispatch a rewrite-selected endpoint without loading unrelated route modules. */
export async function dispatchRoute(request, response, handlers) {
  const route = Array.isArray(request.query?.route) ? request.query.route[0] : request.query?.route;
  let handler = typeof route === 'string' ? handlers[route] : null;
  if (!handler) return sendError(response, clientError('Endpoint not found.', 404));
  try {
    if (handler.load) handler = (await handler.load()).default;
    if (typeof handler !== 'function') throw new Error('The endpoint handler is unavailable.');
    return handler(request, response);
  } catch (error) {
    return sendError(response, error);
  }
}
