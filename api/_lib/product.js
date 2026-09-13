import { clientError } from './http.js';

const PRODUCT_STATUSES = new Set(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const SIZES = new Set(['30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']);

function requiredString(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw clientError(`${label} is required.`);
  return value.trim().slice(0, maxLength);
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw clientError(`${label} must be a non-negative whole number.`);
  return value;
}

function currency(value, label) {
  if (!Number.isInteger(value) || value < 0) throw clientError(`${label} must be a non-negative amount in KSh.`);
  return value;
}

export function validateProduct(input, existing = {}) {
  const source = { ...existing, ...input };
  const name = requiredString(source.name, 'Product name', 160);
  const description = requiredString(source.description, 'Product description', 4000);
  const categoryId = requiredString(source.categoryId, 'Category', 100);
  const sku = requiredString(source.sku, 'SKU', 80).toUpperCase();
  const price = currency(source.price, 'Price');
  const salePrice = source.salePrice === null || source.salePrice === undefined || source.salePrice === ''
    ? null : currency(source.salePrice, 'Sale price');
  if (salePrice !== null && salePrice >= price) throw clientError('Sale price must be lower than the regular price.');
  if (!Array.isArray(source.inventory) || source.inventory.length === 0) throw clientError('Add at least one size inventory record.');

  const seenSizes = new Set();
  const inventory = source.inventory.map((item) => {
    const size = String(item?.size ?? '');
    if (!SIZES.has(size) || seenSizes.has(size)) throw clientError('Inventory sizes must be unique and between 30 and 45.');
    seenSizes.add(size);
    return { size, quantity: nonNegativeInteger(item.quantity, `Size ${size} quantity`) };
  }).sort((a, b) => Number(a.size) - Number(b.size));

  const images = Array.isArray(source.images) ? source.images.slice(0, 8) : [];
  for (const image of images) {
    if (!image || typeof image.url !== 'string' || typeof image.publicId !== 'string' || image.resourceType !== 'image') {
      throw clientError('Each product image must be a signed Cloudinary image record.');
    }
  }
  if (images.length === 0) throw clientError('Add at least one product image.');
  const video = source.video && typeof source.video.url === 'string' && typeof source.video.publicId === 'string' && source.video.resourceType === 'video'
    ? source.video : null;
  if (source.video && !video) throw clientError('Product video must be a signed Cloudinary video record.');
  const status = source.status || 'DRAFT';
  if (!PRODUCT_STATUSES.has(status)) throw clientError('Product status is invalid.');

  return {
    name, description, categoryId, sku, price, salePrice, inventory, images, video, status,
    featured: source.featured === true, bestseller: source.bestseller === true, newArrival: source.newArrival === true,
    stockQuantity: inventory.reduce((total, item) => total + item.quantity, 0),
    availableSizes: inventory.filter((item) => item.quantity > 0).map((item) => item.size)
  };
}

export function productResponse(id, product) {
  const { createdAt, updatedAt, ...data } = product;
  return { id, ...data, createdAt: createdAt?.toDate?.().toISOString() || null, updatedAt: updatedAt?.toDate?.().toISOString() || null };
}
