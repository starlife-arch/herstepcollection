import { getCategories, getProducts } from './product-api.js';

const grid = document.querySelector('#product-grid');
const result = document.querySelector('#catalogue-result');
const dialog = document.querySelector('#product-dialog');
const filters = {
  search: document.querySelector('#product-search'), category: document.querySelector('#category-filter'),
  size: document.querySelector('#size-filter'), availability: document.querySelector('#availability-filter')
};
let products = [];
let categories = [];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
}

function formatMoney(value) { return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value).replace('KES', 'KSh'); }

function filterProducts() {
  const search = filters.search.value.trim().toLowerCase();
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

function openDetail(product) {
  const isSoldOut = product.stockQuantity === 0;
  const images = product.images.map((image, index) => `<img class="${index ? 'product-detail-extra' : 'product-detail-main'}" src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || product.name)}" />`).join('');
  const sizes = product.inventory.map((item) => `<span class="size-option ${item.quantity ? '' : 'unavailable'}" aria-label="Size ${item.size}: ${item.quantity ? 'available' : 'out of stock'}">${item.size}</span>`).join('');
  const price = product.salePrice === null ? formatMoney(product.price) : `${formatMoney(product.salePrice)} <s>${formatMoney(product.price)}</s>`;
  dialog.innerHTML = `<button class="dialog-close" type="button" data-close-product aria-label="Close product details">×</button><div class="product-detail-gallery">${images}</div><section class="product-detail-copy"><p class="eyebrow">${escapeHtml(categoryName(product.categoryId))}</p><h2 id="product-dialog-title">${escapeHtml(product.name)}</h2><p class="product-price product-detail-price">${price}</p><p>${escapeHtml(product.description)}</p><dl><div><dt>SKU</dt><dd>${escapeHtml(product.sku)}</dd></div><div><dt>Availability</dt><dd>${isSoldOut ? 'Sold out' : `${product.stockQuantity} pairs across available sizes`}</dd></div></dl><p class="size-heading">Choose your size</p><div class="size-list size-options">${sizes}</div><p class="catalogue-note">Ordering opens in the next phase. Size and stock are displayed for reference and will be verified securely before purchase.</p></section>`;
  dialog.showModal();
}

grid.addEventListener('click', (event) => {
  const id = event.target.closest('[data-product-id]')?.dataset.productId;
  if (id) openDetail(products.find((product) => product.id === id));
});
dialog.addEventListener('click', (event) => { if (event.target.closest('[data-close-product]')) dialog.close(); });
Object.values(filters).forEach((filter) => filter.addEventListener('input', render));

async function initialiseCatalogue() {
  try {
    const [categoryData, productData] = await Promise.all([getCategories(), getProducts()]);
    categories = categoryData.categories;
    products = productData.products;
    filters.category.insertAdjacentHTML('beforeend', categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join(''));
    render();
  } catch (error) {
    result.textContent = 'The collection could not be loaded.';
    grid.innerHTML = `<div class="catalogue-empty"><h3>Collection unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
  } finally { grid.setAttribute('aria-busy', 'false'); }
}

initialiseCatalogue();
