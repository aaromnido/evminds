/**
 * Wraps an image URL with Cloudinary fetch mode for on-the-fly WebP conversion,
 * resizing, and CDN edge caching. Passes through unchanged in dev mode.
 *
 * Set PUBLIC_CLOUDINARY_CLOUD in env to activate (e.g., "aaromnido").
 */
export function optimizedImageUrl(
  url: string,
  width = 600,
  quality = 75,
): string {
  const cloud = import.meta.env.PUBLIC_CLOUDINARY_CLOUD;
  if (!url || !cloud) return url;
  return `https://res.cloudinary.com/${cloud}/image/fetch/w_${width},f_auto,q_auto/${url}`;
}
