import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../firebase-admin.js';
import { methodNotAllowed, sendError, clientError } from '../http.js';
import { enforceRateLimit } from '../rate-limit.js';
import { createOtp } from '../otp.js';
import { sendEmail, emailHtml } from '../email-service.js';
export default async function handler(request, response) { if (request.method !== 'POST') return methodNotAllowed(response, 'POST'); try { const user = await requireUser(request); if (!user.email) throw clientError('An email address is required.', 400); enforceRateLimit(`otp:${user.uid}`, { limit: 5, windowMs: 60_000 }); const otp = createOtp(); await adminDb.collection('otpCodes').doc(user.uid).set({ hash: otp.hash, expiresAt: otp.expiresAt, usedAt: null, updatedAt: FieldValue.serverTimestamp() }); await sendEmail({ purpose: 'hello', to: user.email, subject: 'Your HerStep verification code', htmlContent: emailHtml('Your verification code', `Use <strong>${otp.code}</strong> to verify your email. It expires in 10 minutes.`) }); return response.status(200).json({ ok: true }); } catch (error) { return sendError(response, error); } }
