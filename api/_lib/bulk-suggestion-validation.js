const sizes = new Set(['30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']);

export function cleanBulkSuggestion(parsed, categories) {
  const categoryId = categories.some((category) => category.id === parsed?.categoryId) ? parsed.categoryId : '';
  const name = typeof parsed?.name === 'string' ? parsed.name.trim().slice(0, 160) : '';
  // Model output remains untrusted and must meet the same draft-save constraints.
  const price = Number.isInteger(parsed?.price) && parsed.price >= 0 ? parsed.price : null;
  const size = typeof parsed?.size === 'string' && sizes.has(parsed.size) ? parsed.size : null;
  return { name, categoryId, price, size };
}
