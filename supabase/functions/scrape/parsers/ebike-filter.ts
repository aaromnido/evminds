/**
 * Filter: Discard e-bike, e-moped and electric bicycle articles.
 *
 * EVMinds covers passenger EVs (cars). E-bikes are a related-but-distinct
 * vertical that some readers dislike seeing in the main feed, so we drop
 * them at scrape time before they ever reach the database, Gemini, or
 * Cloudinary (saves cost too).
 *
 * Heuristic: keyword match against title + excerpt.
 */

const BLACKLIST = [
  // English
  'e-bike',
  'ebike',
  'e bike',
  'electric bike',
  'electric bicycle',
  'e-mtb',
  'emtb',
  'moped',
  'e-moped',
  'electric moped',
  // Spanish
  'bicicleta',
  'bicis',
  'bici eléctrica',
  'bici electrica',
  'ciclismo',
  'ciclomotor eléctrico',
  'ciclomotor electrico',
  'pedelec',
];

/**
 * Returns true if the article should be kept (is NOT an e-bike / moped article).
 */
export function isNotEBike(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`.toLowerCase();
  return !BLACKLIST.some((term) => text.includes(term));
}
