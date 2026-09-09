import crypto from 'node:crypto';
import { clientError } from './http.js';

export function createOtp() { const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'); return { code, hash: hashOtp(code), expiresAt: new Date(Date.now() + 10 * 60_000) }; }
export function hashOtp(code) { return crypto.createHash('sha256').update(String(code)).digest('hex'); }
export function verifyOtp(record, code, now = new Date()) { const expiry = record?.expiresAt?.toDate ? record.expiresAt.toDate() : new Date(record?.expiresAt); if (!record?.hash || Number.isNaN(expiry.getTime()) || expiry <= now || !/^\d{6}$/.test(String(code)) || hashOtp(code) !== record.hash) throw clientError('The verification code is invalid or has expired.', 400); return true; }
