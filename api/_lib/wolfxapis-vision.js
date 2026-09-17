// wolfXapis returns plain text rather than a structured-response envelope. Extract the
// first complete JSON object so harmless prose or Markdown fences do not block a draft.
export function parseWolfXapisSuggestion(text) {
  if (typeof text !== 'string') throw new Error('wolfXapis returned a non-text response.');
  const start = text.indexOf('{');
  if (start === -1) throw new Error(`wolfXapis response did not include JSON: ${text}`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\' && quoted) { escaped = true; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, index + 1)); }
        catch { throw new Error(`wolfXapis response contained invalid JSON: ${text}`); }
      }
    }
  }
  throw new Error(`wolfXapis response contained incomplete JSON: ${text}`);
}

export async function wolfXapisSuggestion({ imageUrl, prompt }) {
  const query = new URLSearchParams({ q: prompt, imageUrl });
  const result = await fetch(`https://apis.xwolf.space/api/nvidia/vision?${query}`, {
    headers: { 'x-api-key': process.env.WOLFXAPIS_KEY }
  });
  const bodyText = await result.text().catch(() => '');
  if (!result.ok) throw new Error(`wolfXapis request failed (${result.status}): ${bodyText}`);
  return parseWolfXapisSuggestion(bodyText);
}
