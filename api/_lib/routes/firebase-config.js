const publicConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed.' });
  if (Object.values(publicConfig).some((value) => !value)) {
    return response.status(503).json({ error: 'Firebase is not configured.' });
  }
  response.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return response.status(200).json(publicConfig);
}
