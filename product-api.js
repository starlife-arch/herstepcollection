async function request(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'The collection is unavailable right now.');
  }
  return response.json();
}

export const getCategories = () => request('/api/categories');
export const getProducts = () => request('/api/products');
