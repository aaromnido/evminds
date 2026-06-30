/**
 * Valid categories for OWN posts (tabla posts).
 *
 * These are the editorial content types EVMinds writes in-house (experiences,
 * guides, reviews, opinions, trip reports) — NOT the news categories from
 * src/lib/categories.ts (Coches eléctricos, Industria, ...). Both are
 * category-like constants but belong to different content pipelines; keep them
 * separate to avoid mixing them.
 */
export const VALID_POST_CATEGORIES = ["Experiencia", "Guía", "Review", "Opinión", "Viaje"] as const;

export type PostCategory = (typeof VALID_POST_CATEGORIES)[number];

export function isValidPostCategory(value: string): value is PostCategory {
  return (VALID_POST_CATEGORIES as readonly string[]).includes(value);
}
