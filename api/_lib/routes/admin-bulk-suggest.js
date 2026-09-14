import { requireAdmin } from '../firebase-admin.js';
import { cleanBulkSuggestion } from '../bulk-suggestion-validation.js';
import { clientError, methodNotAllowed, sendError } from '../http.js';

const GROQ_MIN_INTERVAL_MS = 2_100;
const GROQ_RATE_LIMIT_RETRIES = 3;
let nextGroqRequestAt = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function paceGroq() {
  const now = Date.now();
  const delay = Math.max(0, nextGroqRequestAt - now);
  nextGroqRequestAt = Math.max(now, nextGroqRequestAt) + GROQ_MIN_INTERVAL_MS;
  if (delay) await wait(delay);
}

async function groqSuggestion({ imageUrl, prompt }) {
  const model = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const request = () => fetch(endpoint, {
    method: 'POST',
    headers: { Authorization:`Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role:'user', content:[{ type:'text', text:prompt }, { type:'image_url', image_url:{ url:imageUrl } }] }],
      response_format: { type:'json_object' }
    })
  });
  for (let attempt = 0; attempt <= GROQ_RATE_LIMIT_RETRIES; attempt += 1) {
    await paceGroq();
    const result = await request();
    if (result.ok) {
      const payload = await result.json();
      const text = payload.choices?.[0]?.message?.content || '{}';
      try { return JSON.parse(text); } catch { return {}; }
    }
    if (result.status !== 429 || attempt === GROQ_RATE_LIMIT_RETRIES) {
      const bodyText = await result.text().catch(() => '');
      throw new Error(`Groq request failed (${result.status}): ${bodyText}`);
    }
    const retryAfter = Number(result.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 1_000 * 2 ** attempt);
  }
  return {};
}

async function openAiSuggestion({ imageUrl, prompt }) {
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini';
  const result = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model, input:[{ role:'user', content:[{ type:'input_text', text:prompt },{ type:'input_image', image_url:imageUrl }] }], text:{ format:{ type:'json_object' } } }) });
  if (!result.ok) throw new Error(`OpenAI request failed (${result.status}).`);
  const payload = await result.json();
  try { return JSON.parse(payload.output_text || '{}'); } catch { return {}; }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  try {
    await requireAdmin(request);
    const imageUrl = typeof request.body?.imageUrl === 'string' ? request.body.imageUrl : '';
    const categories = Array.isArray(request.body?.categories) ? request.body.categories.filter((category) => category && typeof category.id === 'string' && typeof category.name === 'string').slice(0, 100) : [];
    if (!imageUrl.startsWith('https://res.cloudinary.com/') || !categories.length) throw clientError('A signed Cloudinary image and categories are required.');
    const prompt = `Look at this ladies footwear product photo. Return JSON only with keys name, categoryId, price, and size. name must be a short sellable name; categoryId must be one of: ${JSON.stringify(categories)}. price must be the visible price-tag amount as an integer in KSh, or null if it is not clearly shown. size must be a string from 30 through 45, or null if it is not clearly shown; if a range such as "37/38" is shown, use its first number ("37"). Do not guess any field; use empty strings for uncertain name/categoryId and null for uncertain price/size.`;
    if (process.env.GROQ_API_KEY) {
      try { return response.status(200).json({ configured:true, provider:'GROQ', suggestion:cleanBulkSuggestion(await groqSuggestion({ imageUrl, prompt }), categories) }); } catch (error) { console.error('Groq suggestion failed:', error.message); /* Try the paid fallback after Groq errors or exhausted rate-limit retries. */ }
    }
    if (process.env.OPENAI_API_KEY) {
      try { return response.status(200).json({ configured:true, provider:'OPENAI', suggestion:cleanBulkSuggestion(await openAiSuggestion({ imageUrl, prompt }), categories) }); } catch (error) { console.error('OpenAI suggestion failed:', error.message); /* OCR remains available when OpenAI is unavailable. */ }
    }
    return response.status(200).json({ configured:Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY), provider:null, suggestion:null });
  } catch (error) { return sendError(response, error); }
}
