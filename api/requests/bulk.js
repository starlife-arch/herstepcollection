// api/bulk.js
import { adminDb } from '../_lib/firebase-admin.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get all bulk orders
      const snapshot = await adminDb.collection('bulkOrderRequests').get();
      const data = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      res.status(200).json({ success: true, data });
    } 
    else if (req.method === 'POST') {
      // Create new bulk order
      const newData = req.body;
      const docRef = await adminDb.collection('bulkOrderRequests').add({
        ...newData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      const doc = await docRef.get();
      res.status(201).json({ 
        success: true, 
        data: { id: doc.id, ...doc.data() } 
      });
    } 
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
