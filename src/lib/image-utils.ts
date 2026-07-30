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

/**
 * URL that downloads the image instead of displaying it.
 *
 * A plain `<a download>` is ignored by browsers for cross-origin files, and every
 * image here lives on Cloudinary, so the download has to be asked for at the
 * source: `fl_attachment` makes Cloudinary send a `Content-Disposition` header.
 * Anything not served from our own Cloudinary upload URLs is returned untouched
 * and simply opens in a new tab, which is the best that can be done for it.
 */
export function downloadableImageUrl(url: string): string {
  const cloud = import.meta.env.PUBLIC_CLOUDINARY_CLOUD;
  if (!url || !cloud) return url;

  const uploadPrefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
  if (!url.startsWith(uploadPrefix)) return url;

  return url.replace("/image/upload/", "/image/upload/fl_attachment/");
}
