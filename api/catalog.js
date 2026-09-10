import { dispatchRoute, lazyRoute } from './_lib/route-dispatch.js';
export default (request, response) => dispatchRoute(request, response, {
  announcement: lazyRoute(() => import('./_lib/routes/announcement.js')),
  categories: lazyRoute(() => import('./_lib/routes/categories.js')),
  'firebase-config': lazyRoute(() => import('./_lib/routes/firebase-config.js')),
  hero: lazyRoute(() => import('./_lib/routes/hero.js')),
  health: lazyRoute(() => import('./_lib/routes/health.js')),
  'media-sign-upload': lazyRoute(() => import('./_lib/routes/media-sign-upload.js')),
  'promo-codes': lazyRoute(() => import('./_lib/routes/promo-codes.js')),
  products: lazyRoute(() => import('./_lib/routes/products.js')),
  'product-detail': lazyRoute(() => import('./_lib/routes/products-id.js')),
  promotions: lazyRoute(() => import('./_lib/routes/promotions.js'))
});
