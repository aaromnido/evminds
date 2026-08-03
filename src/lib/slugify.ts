/**
 * Spanish articles, prepositions and conjunctions dropped from a slug: they
 * add length without adding SEO value. Deliberately narrower than
 * `related-articles.ts`'s STOPWORDS (keyword extraction, which also drops
 * demonstratives/possessives) — a slug should still read as the title minus
 * its function words, not as a bag of topic keywords.
 */
const SLUG_STOPWORDS = new Set([
  // Articles (+ contractions)
  "el",
  "la",
  "los",
  "las",
  "lo",
  "un",
  "una",
  "unos",
  "unas",
  "al",
  "del",
  // Prepositions
  "a",
  "ante",
  "bajo",
  "cabe",
  "con",
  "contra",
  "de",
  "desde",
  "durante",
  "en",
  "entre",
  "hacia",
  "hasta",
  "mediante",
  "para",
  "por",
  "según",
  "sin",
  "so",
  "sobre",
  "tras",
  // Conjunctions
  "y",
  "e",
  "o",
  "u",
  "ni",
  "que",
  "pero",
  "sino",
  "aunque",
  "mientras",
]);

/**
 * Generate a URL-safe slug from a title string.
 * Handles accented characters, ñ, and special punctuation, and drops Spanish
 * stopwords (articles, prepositions, conjunctions) for a shorter, SEO-friendly
 * result — unless doing so would empty the slug entirely, e.g. a title that is
 * itself just a stopword phrase.
 */
export function slugify(text: string): string {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove diacritics
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric
    .split(/[\s-]+/)
    .filter(Boolean);

  const withoutStopwords = words.filter((word) => !SLUG_STOPWORDS.has(word));
  return (withoutStopwords.length ? withoutStopwords : words).join("-");
}
