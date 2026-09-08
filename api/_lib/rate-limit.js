import { clientError } from './http.js';

const buckets = new Map();
export function enforceRateLimit(key, { limit = 8, windowMs = 60_000 } = {}) {
  const now = Date.now(); const active = (buckets.get(key) || []).filter((time) => now - time < windowMs);
  if (active.length >= limit) throw clientError('Too many requests. Please wait a moment and try again.', 429);
  active.push(now); buckets.set(key, active);
}
