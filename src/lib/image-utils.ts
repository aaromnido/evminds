/**
 * Returns a Cloudinary-optimized URL for the given image.
 *
 * - URLs already native to our Cloudinary account (upload mode) get the
 *   transformation injected inline, avoiding a double-fetch.
 * - Any other external origin (e.g. legacy Supabase Storage) is wrapped in
 *   Cloudinary fetch mode for on-the-fly WebP conversion and CDN caching.
 *
 * Passes through unchanged if PUBLIC_CLOUDINARY_CLOUD is not set.
 */
export function optimizedImageUrl(url: string, width = 600, quality = 75): string {
  const cloud = import.meta.env.PUBLIC_CLOUDINARY_CLOUD;
  if (!url || !cloud || !url.startsWith("http")) return url;

  const uploadPrefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
  if (url.startsWith(uploadPrefix)) {
    return url.replace("/image/upload/", `/image/upload/w_${width},f_auto,q_auto/`);
  }

  return `https://res.cloudinary.com/${cloud}/image/fetch/w_${width},f_auto,q_auto/${url}`;
}
