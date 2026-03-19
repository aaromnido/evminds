/**
 * Wraps an image URL with Cloudinary fetch mode for on-the-fly WebP conversion,
 * resizing, and CDN edge caching. Passes through unchanged in dev mode.
 */
const CLOUDINARY_CLOUD = "aaromnido";

export function optimizedImageUrl(
  url: string,
  width = 600,
  quality = 75,
): string {
  if (!url || import.meta.env.DEV) return url;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/w_${width},f_webp,q_${quality}/${url}`;
}
