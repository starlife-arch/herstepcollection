import { clientError } from './http.js';

const FOCAL_POINTS = new Set(['left top', 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom']);
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const validLink = (value) => typeof value === 'string' && /^(?:#[^\s]*|\/(?:[^\s]*)|https:\/\/[^\s]+)$/.test(value);
const validMedia = (media, types) => media && typeof media === 'object' && types.has(media.resourceType) && typeof media.url === 'string' && /^https:\/\//.test(media.url) && typeof media.publicId === 'string' && media.publicId.trim();

export function normalizeHero(hero = {}) {
  if (Array.isArray(hero.slides)) return { enabled: hero.enabled === true, slides: hero.slides };
  const media = hero.videoUrl ? { url: hero.videoUrl, publicId: 'legacy-video', resourceType: 'video' } : hero.imageUrl ? { url: hero.imageUrl, publicId: 'legacy-image', resourceType: 'image' } : null;
  return { enabled: hero.enabled === true, slides: media ? [{ media, title: hero.title || '', copy: hero.copy || '', ctaLabel: hero.ctaLabel || '', ctaUrl: hero.ctaUrl || '/shop', focalPoint: 'center center', mobileMedia: null }] : [] };
}

export function validateHeroSettings(input = {}) {
  if (typeof input.enabled !== 'boolean' || !Array.isArray(input.slides) || input.slides.length < 1 || input.slides.length > 8) throw clientError('Add between one and eight hero slides.');
  const slides = input.slides.map((slide) => {
    const title = text(slide?.title, 160); const copy = text(slide?.copy, 500); const ctaLabel = text(slide?.ctaLabel, 80); const ctaUrl = typeof slide?.ctaUrl === 'string' ? slide.ctaUrl.trim() : '';
    if (!title || !copy || !ctaLabel || !validLink(ctaUrl) || !validMedia(slide?.media, new Set(['image', 'video'])) || (slide.mobileMedia && !validMedia(slide.mobileMedia, new Set(['image'])))) throw clientError('Provide a headline, copy, CTA, secure Cloudinary media, and an optional mobile image for every hero slide.');
    const focalPoint = FOCAL_POINTS.has(slide.focalPoint) ? slide.focalPoint : 'center center';
    return { title, copy, ctaLabel, ctaUrl, media:slide.media, mobileMedia:slide.mobileMedia || null, focalPoint };
  });
  return { enabled:input.enabled, slides };
}
