import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('product detail title selector matches its h1 markup and includes mobile-safe spacing', async () => {
  const [styles, catalogue] = await Promise.all([source('styles.css'), source('catalogue.js')]);
  assert.match(catalogue, /<section class="product-detail-copy">[\s\S]*<h1>\$\{escapeHtml\(product\.name\)\}<\/h1>/);
  assert.match(styles, /\.product-detail-copy h1 \{ position:relative; z-index:1; clear:both; margin:\.1rem 0 \.7rem; font-size:clamp\(2rem,4vw,3\.3rem\); \}/);
  assert.doesNotMatch(styles, /\.product-detail-copy h2/);
  assert.doesNotMatch(styles, /\.product-detail-main,\.hero-video \{ width:100%; height:auto; \}/);
  assert.match(styles, /\.product-detail-gallery img \{ display:block; width:100%; height:100%; object-fit:cover;/);
  assert.match(styles, /@media \(max-width:750px\) \{[\s\S]*\.product-detail-gallery \{ grid-template-columns:1fr 1fr; \}[\s\S]*\.product-detail-gallery \.product-detail-main \{ grid-column:1\/-1; \}[\s\S]*\.product-detail-copy \{ padding:1\.5rem; \}/);
});
