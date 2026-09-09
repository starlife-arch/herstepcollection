import { clientError } from './http.js';

export function normalizeKenyanPhone(value) {
  const raw = typeof value === 'string' ? value.replace(/[\s()-]/g, '') : '';
  const national = raw.startsWith('0') ? `254${raw.slice(1)}` : raw.startsWith('+') ? raw.slice(1) : raw;
  if (!/^254[17]\d{8}$/.test(national)) throw clientError('Enter a valid Kenyan phone number.');
  return `+${national}`;
}
