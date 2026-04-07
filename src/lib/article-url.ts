import { CONTENT_TYPES } from './content-types';

/**
 * Generate internal news detail URL from news slug
 */
export function getNewsUrl(slug: string): string {
  return `/noticia/${slug}`;
}

/**
 * Generate internal video detail URL from video slug
 */
export function getVideoUrl(slug: string): string {
  return `/video/${slug}`;
}

/**
 * Generate internal article detail URL from slug
 */
export function getArticleUrl(slug: string): string {
  return `/articulo/${slug}`;
}

/**
 * Generate the correct detail URL based on content type
 */
export function getContentUrl(slug: string, contentType: string = CONTENT_TYPES.NEWS): string {
  if (contentType === CONTENT_TYPES.VIDEO) return getVideoUrl(slug);
  if (contentType === CONTENT_TYPES.ARTICLE) return getArticleUrl(slug);
  return getNewsUrl(slug);
}
