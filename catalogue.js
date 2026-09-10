import { getCategories, getProducts } from './product-api.js';

const grid = document.querySelector('#product-grid');
const result = document.querySelector('#catalogue-result');
const dialog = document.querySelector('#product-dialog');
const filters = {
  search: document.querySelector('#product-search'), category: document.querySelector('#category-filter'),
  size: document.querySelector('#size-filter'), availability: document.querySelector('#availability-filter'), headerSearch: document.querySelector('#header-product-search')
};
let products = [];
let categories = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
}

function formatMoney(value) { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value).replace('KES', 'KSh'); }

function filterProducts() {
  const search = (filters.search.value || filters.headerSearch.value).trim().toLowerCase();
  return products.filter((product) => {
    const text = `${product.name} ${product.sku} ${categoryName(product.categoryId)}`.toLowerCase();
    const inStock = product.stockQuantity > 0;
    return (!search || text.includes(search))
      && (!filters.category.value || product.categoryId === filters.category.value)
      && (!filters.size.value || product.availableSizes.includes(filters.size.value))
      && (!filters.availability.value || (filters.availability.value === 'in-stock' ? inStock : !inStock));
  });
}

function categoryName(categoryId) { return categories.find((category) => category.id === categoryId)?.name || 'Footwear'; }

function render() {
  const items = filterProducts();
  result.textContent = items.length === 1 ? '1 style available.' : `${items.length} styles available.`;
  if (!items.length) {
    grid.innerHTML = '<div class="catalogue-empty"><h3>No styles match those filters.</h3><p>Try another size, category, or search term.</p></div>';
    return;
  }
  grid.innerHTML = items.map((product) => {
    const image = product.images[0];
    const isSoldOut = product.stockQuantity === 0;
    const price = product.salePrice === null ? `<strong>${formatMoney(product.price)}</strong>` : `<strong>${formatMoney(product.salePrice)}</strong><s>${formatMoney(product.price)}</s>`;
    return `<article class="product-card"><button class="product-image-button" type="button" data-product-id="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.name)}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || product.name)}" loading="lazy" /></button><div class="product-card-body"><p class="product-category">${escapeHtml(categoryName(product.categoryId))}</p><h3>${escapeHtml(product.name)}</h3><p class="product-price">${price}</p><p class="size-list">${product.inventory.map((item) => `<span class="${item.quantity ? '' : 'unavailable'}">${item.size}</span>`).join('')}</p><div class="product-card-footer"><span class="status ${isSoldOut ? 'status-muted' : ''}">${isSoldOut ? 'Sold out' : 'Available sizes'}</span><button class="text-button product-view" type="button" data-product-id="${escapeHtml(product.id)}">View details</button></div></div></article>`;
  }).join('');
}

function renderCategoryPills() {
  const rail = document.querySelector('#category-pills');
  if (!rail) return;
  rail.innerHTML = `<button class="category-pill is-active" type="button" data-category="">All styles</button>${categories.map((category) => `<button class="category-pill" type="button" data-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('')}`;
  rail.addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (!button) return; filters.category.value = button.dataset.category; rail.querySelectorAll('.category-pill').forEach((pill) => pill.classList.toggle('is-active', pill === button)); render(); document.querySelector('#shop').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}


function openDetail(product) {
  const isSoldOut = product.stockQuantity === 0;
  const images = product.images.map((image, index) => `<img class="${index ? 'product-detail-extra' : 'product-detail-main'}" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || product.name)}" />`).join('');
  const sizes = product.inventory.map((item) => `<option value="${item.size}" ${item.quantity ? '' : 'disabled'}>${item.size}${item.quantity ? '' : ' — unavailable'}</option>`).join('');
  const price = product.salePrice === null ? formatMoney(product.price) : `${formatMoney(product.salePrice)} <s>${formatMoney(product.price)}</s>`;
  dialog.innerHTML = `<button class="dialog-close" type="button" data-close-product aria-label="Close product details">×</button><div class="product-detail-gallery">${images}</div><section class="product-detail-copy"><p class="eyebrow">${escapeHtml(categoryName(product.categoryId))}</p><h2 id="product-dialog-title">${escapeHtml(product.name)}</h2><p class="product-price product-detail-price">${price}</p><p>${escapeHtml(product.description)}</p><dl><div><dt>SKU</dt><dd>${escapeHtml(product.sku)}</dd></div><div><dt>Availability</dt><dd>${isSoldOut ? 'Sold out' : `${product.stockQuantity} pairs across available sizes`}</dd></div></dl><form class="add-cart-form" data-product-id="${escapeHtml(product.id)}"><label>Choose your size<select name="size" ${isSoldOut ? 'disabled' : ''}>${sizes}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="10" value="1" ${isSoldOut ? 'disabled' : ''} /></label><button class="button" type="submit" ${isSoldOut ? 'disabled' : ''}>${isSoldOut ? 'Sold out' : 'Add to cart'}</button></form><p class="catalogue-note">Prices and stock are verified securely when you create an order.</p></section>`;
  dialog.showModal();
}

grid.addEventListener('click', (event) => {
  const id = event.target.closest('[data-product-id]')?.dataset.productId;
  if (id) openDetail(products.find((product) => product.id === id));
});
dialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-product]')) dialog.close(); });
dialog.addEventListener('submit', (event) => {
  if (!event.target.matches('.add-cart-form')) return;
  event.preventDefault(); const product = products.find((item) => item.id === event.target.dataset.productId); const data = new FormData(event.target); const size = data.get('size'); const quantity = Number(data.get('quantity')); const stock = product.inventory.find((item) => item.size === size);
  if (!stock || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || quantity > stock.quantity) return;
  window.dispatchEvent(new CustomEvent('herstep-add-cart', { detail: { productId: product.id, size, quantity, name: product.name, price: product.salePrice ?? product.price, image: product.images[0].url } })); dialog.close();
});
filters.search.addEventListener('input', () => { filters.headerSearch.value = filters.search.value; render(); });
filters.headerSearch.addEventListener('input', () => { filters.search.value = filters.headerSearch.value; render(); });
[filters.category, filters.size, filters.availability].forEach((filter) => filter.addEventListener('input', render));

async function initialiseCatalogue() {
  try {
    const [categoryData, productData] = await Promise.all([getCategories(), getProducts()]);
    categories = categoryData.categories;
    products = productData.products;
    updateProductSchema(products);
    filters.category.insertAdjacentHTML('beforeend', categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join(''));
    renderCategoryPills();
    render();
  } catch (error) {
    result.textContent = 'The collection could not be loaded.';
    grid.innerHTML = `<div class="catalogue-empty"><h3>Collection unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
  } finally { grid.setAttribute('aria-busy', 'false'); }
}

function updateProductSchema(items) {
  const schema = document.querySelector('#catalogue-schema'); if (!schema) return;
  schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': items.slice(0, 50).map((product) => ({ '@type': 'Product', name: product.name, sku: product.sku, image: product.images?.map((image) => image.url) || [], offers: { '@type': 'Offer', priceCurrency: 'KES', price: product.salePrice ?? product.price, availability: product.stockQuantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } })) });
}

initialiseCatalogue();
