import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}
const app = getApps()[0] || initializeApp({
  credential: cert({
    projectId: required('FIREBASE_ADMIN_PROJECT_ID'),
    clientEmail: required('FIREBASE_ADMIN_CLIENT_EMAIL'),
    privateKey: required('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n')
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
