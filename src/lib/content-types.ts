/**
 * Content type constants for articles, videos, and future blog posts.
 */
export const CONTENT_TYPES = {
  NEWS: 'news',
  VIDEO: 'video',
  BLOG: 'blog',
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
