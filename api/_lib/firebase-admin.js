import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function required(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing required server environment variable: ${name}`);
    error.statusCode = 503;
    throw error;
  }
  return value;
}

function normalisePrivateKey(rawValue) {
  // Tolerate whichever way the key was pasted into the environment variable:
  // - a single line with literal "\n" escapes (the documented format), or
  // - a value with real line breaks (what most people end up pasting).
  // Also strip leading/trailing whitespace, which breaks PEM parsing.
  const unescaped = rawValue.replace(/\\n/g, '\n').trim();
  if (!unescaped.includes('-----BEGIN PRIVATE KEY-----') || !unescaped.includes('-----END PRIVATE KEY-----')) {
    const error = new Error('FIREBASE_ADMIN_PRIVATE_KEY does not look like a valid PEM private key.');
    error.statusCode = 503;
    throw error;
  }
  return unescaped;
}

const app = getApps()[0] || initializeApp({
  credential: cert({
    projectId: required('FIREBASE_ADMIN_PROJECT_ID').trim(),
    clientEmail: required('FIREBASE_ADMIN_CLIENT_EMAIL').trim(),
    privateKey: normalisePrivateKey(required('FIREBASE_ADMIN_PRIVATE_KEY'))
  })
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export async function requireUser(request) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    const error = new Error('Authentication is required.');
    error.statusCode = 401;
    throw error;
  }
  try {
    return await adminAuth.verifyIdToken(authorization.slice(7));
  } catch {
    const error = new Error('Your session is invalid or expired.');
    error.statusCode = 401;
    throw error;
  }
}

export async function requireAdmin(request) {
  const user = await requireUser(request);
  const profile = await adminDb.collection('users').doc(user.uid).get();
  if (!profile.exists || !['ADMIN', 'SUPER_ADMIN'].includes(profile.data().role)) {
    const error = new Error('Administrator access is required.');
    error.statusCode = 403;
    throw error;
  }
  return { user, profile: profile.data() };
}
