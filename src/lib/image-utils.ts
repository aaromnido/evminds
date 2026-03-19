/**
 * Wraps an image URL with Netlify Image CDN for on-the-fly WebP conversion,
 * resizing, and edge caching. Passes through unchanged in dev mode.
 */
export function optimizedImageUrl(
  url: string,
  width = 600,
  quality = 75,
): string {
  if (!url || import.meta.env.DEV) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${width}&fm=webp&q=${quality}`;
}
