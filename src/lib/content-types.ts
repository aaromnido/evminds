/**
 * Content type constants for news, videos, and own articles.
 */
export const CONTENT_TYPES = {
  NEWS: "news",
  VIDEO: "video",
  ARTICLE: "article",
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];
