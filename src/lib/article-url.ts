import { CONTENT_TYPES } from './content-types';

/**
 * Generate internal article detail URL from article slug
 */
export function getArticleUrl(slug: string): string {
  return `/articulo/${slug}`;
}

/**
 * Generate internal video detail URL from video slug
 */
export function getVideoUrl(slug: string): string {
  return `/video/${slug}`;
}

/**
 * Generate the correct detail URL based on content type
 */
export function getContentUrl(slug: string, contentType: string = CONTENT_TYPES.NEWS): string {
  return contentType === CONTENT_TYPES.VIDEO ? getVideoUrl(slug) : getArticleUrl(slug);
}
