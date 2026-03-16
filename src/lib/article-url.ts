/**
 * Generate internal article detail URL from article slug
 */
export function getArticleUrl(slug: string): string {
  return `/articulo/${slug}`;
}
