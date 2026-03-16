/**
 * Generate internal article detail URL from article UUID
 */
export function getArticleUrl(articleId: string): string {
  return `/articulo/${articleId}`;
}
