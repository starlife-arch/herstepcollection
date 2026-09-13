import { requireAdmin } from '../firebase-admin.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    await requireAdmin(request);
    const imageUrl = typeof request.body?.imageUrl === 'string' ? request.body.imageUrl : '';
    const categories = Array.isArray(request.body?.categories) ? request.body.categories.filter((category) => category && typeof category.id === 'string' && typeof category.name === 'string').slice(0, 100) : [];
    if (!imageUrl.startsWith('https://res.cloudinary.com/') || !categories.length) throw clientError('A signed Cloudinary image and categories are required.');
    if (!process.env.OPENAI_API_KEY) return response.status(200).json({ configured:false, suggestion:null });
    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';
    const prompt = `Look at this ladies footwear product photo. Return JSON only with keys name and categoryId. name must be a short sellable name; categoryId must be one of: ${JSON.stringify(categories)}. Do not infer price or size. If uncertain, return empty strings.`;
    const result = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model, input:[{ role:'user', content:[{ type:'input_text', text:prompt },{ type:'input_image', image_url:imageUrl }] }], text:{ format:{ type:'json_object' } } }) });
    if (!result.ok) throw clientError('AI suggestion is temporarily unavailable.', 502);
    const payload = await result.json(); let parsed = {};
    try { parsed = JSON.parse(payload.output_text || '{}'); } catch { /* Leave uncertain suggestions empty. */ }
    const categoryId = categories.some((category) => category.id === parsed.categoryId) ? parsed.categoryId : '';
    const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0,160) : '';
    return response.status(200).json({ configured:true, suggestion:{ name, categoryId } });
  } catch (error) { return sendError(response, error); }
}
