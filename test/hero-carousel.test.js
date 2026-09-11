import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHero, validateHeroSettings } from '../api/_lib/hero.js';
import { readFile } from 'node:fs/promises';

const slide = {
  title:'New heels', copy:'A confident new step.', ctaLabel:'Shop heels', ctaUrl:'/shop', focalPoint:'right center',
  media:{ url:'https://res.cloudinary.com/herstep/video/upload/heels.mp4', publicId:'hero/heels', resourceType:'video' },
  mobileMedia:{ url:'https://res.cloudinary.com/herstep/image/upload/heels-mobile.jpg', publicId:'hero/heels-mobile', resourceType:'image' }
};

test('hero settings preserve several Cloudinary slides with focal and mobile media', () => {
  const settings = validateHeroSettings({ enabled:true, slides:[slide, { ...slide, title:'Summer sandals', media:{ ...slide.media, resourceType:'image' } }] });
  assert.equal(settings.slides.length, 2);
  assert.equal(settings.slides[0].focalPoint, 'right center');
  assert.equal(settings.slides[0].mobileMedia.resourceType, 'image');
  assert.throws(() => validateHeroSettings({ enabled:true, slides:[{ ...slide, mobileMedia:{ ...slide.mobileMedia, resourceType:'video' } }] }), /secure Cloudinary media/);
});

test('legacy single-media hero records remain readable as a one-slide carousel', () => {
  const hero = normalizeHero({ enabled:true, title:'Legacy', copy:'Copy', ctaLabel:'Shop', ctaUrl:'/shop', imageUrl:'https://res.cloudinary.com/herstep/image/upload/legacy.jpg' });
  assert.equal(hero.slides.length, 1); assert.equal(hero.slides[0].media.resourceType, 'image');
});

test('storefront carousel has manual controls, touch navigation, lazy media, and muted video', async () => {
  const [app, router] = await Promise.all([readFile(new URL('../app.js', import.meta.url), 'utf8'), readFile(new URL('../router.js', import.meta.url), 'utf8')]);
  assert.match(router, /hero-previous/); assert.match(router, /hero-next/); assert.match(app, /touchstart/); assert.match(app, /touchend/);
  assert.match(app, /node\.muted = true/); assert.match(app, /node\.preload = index === 0 \? 'metadata' : 'none'/); assert.match(app, /fetchPriority = index === 0 \? 'high' : 'low'/);
});
