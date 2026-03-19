/**
 * Wraps an image URL with Netlify Image CDN for on-the-fly WebP conversion,
 * resizing, and edge caching.
 *
 * Set ENABLE_IMAGE_CDN=true in env to activate. Disabled by default until
 * Netlify Image CDN is confirmed working on the site.
 */
export function optimizedImageUrl(
  url: string,
  width = 600,
  quality = 75,
): string {
  if (!url || !import.meta.env.ENABLE_IMAGE_CDN) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}&fm=webp&q=${quality}`;
}
