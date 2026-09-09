const webVariables = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];
const adminVariables = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY'
];

function missing(names) {
  return names.filter((name) => !process.env[name]);
}

/** Safe deployment diagnostic: reports variable names only, never their values. */
export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  const missingWeb = missing(webVariables);
  const missingAdmin = missing(adminVariables);
  return response.status(200).json({
    ok: missingWeb.length === 0 && missingAdmin.length === 0,
    firebaseWeb: { configured: missingWeb.length === 0, missing: missingWeb },
    firebaseAdmin: { configured: missingAdmin.length === 0, missing: missingAdmin }
  });
}
