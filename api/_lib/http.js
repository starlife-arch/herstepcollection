export function methodNotAllowed(response, allowed) {
  response.setHeader('Allow', allowed);
  return response.status(405).json({ error: 'Method not allowed.' });
}

export function sendError(response, error) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error(error);
  return response.status(status).json({ error: status < 500 ? error.message : 'We could not complete that request.' });
}

export function clientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
