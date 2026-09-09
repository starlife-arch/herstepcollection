import crypto from 'node:crypto';
import { requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

const MEDIA = {
  image: { formats: ['jpg', 'jpeg', 'png', 'webp'], maxBytes: 8 * 1024 * 1024 },
  video: { formats: ['mp4', 'webm', 'mov'], maxBytes: 60 * 1024 * 1024 }
};

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    await requireAdmin(request);
    const resourceType = request.body?.resourceType;
    const config = MEDIA[resourceType];
    const fileName = typeof request.body?.fileName === 'string' ? request.body.fileName.trim() : '';
    const bytes = request.body?.bytes;
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!config || !fileName || !config.formats.includes(extension) || !Number.isInteger(bytes) || bytes < 1 || bytes > config.maxBytes) {
      throw clientError('This file type or size is not allowed.');
    }
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      const error = clientError('Media upload is not configured.', 503);
      throw error;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `herstep/products/${resourceType}s`;
    const publicId = `${Date.now()}-${crypto.randomUUID()}`;
    const allowedFormats = config.formats.join(',');
    const signaturePayload = `allowed_formats=${allowedFormats}&folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');
    return response.status(200).json({ cloudName, apiKey, timestamp, signature, folder, publicId, resourceType, allowedFormats, maxBytes: config.maxBytes });
  } catch (error) { return sendError(response, error); }
}
