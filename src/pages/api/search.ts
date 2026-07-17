import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import { ARTICLE_SELECT, normalizeArticles } from "@/lib/article-utils";
import { getContentUrl } from "@/lib/article-url";
import { formatShortDate } from "@/lib/date-utils";
import { CONTENT_TYPES } from "@/lib/content-types";
import { getOwnArticles } from "@/lib/own-articles";
import { stripHtml } from "@/lib/html-utils";

/**
 * GET /api/search
 *
 * Hybrid keyword search for the Spotlight search modal, across two sources:
 *  1. Supabase `articles` table (news + video) via the `search_articles` RPC
 *     (pg_trgm + unaccent): partial words, typos, accents, language-agnostic.
 *  2. Own content (markdown + `posts`), via getOwnArticles() — searched
 *     in-memory here so it shows up too.
 *
 * Own content is surfaced first (original, high-value), then the ranked DB
 * results. Both sources normalize accents the same way for consistent matching.
 *
 * Query params:
 * - q: search term (min 2 chars; shorter returns an empty list)
 *
 * Response:
 * - results: SearchResult[] (lean shape for the modal list)
 *
 * Note: search intentionally ignores the user's feed exclusions (hidden
 * sources/categories) — searching is an explicit intent across all content.
 */

const MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 10;

/** Lowercase + strip accents, mirroring the DB's unaccent() so both sources match alike. */
function normalize(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Parse a query the same way the search_articles RPC does: a fully double-quoted
 * query ("avances en silicio") is an exact phrase; otherwise it's word tokens
 * (matched with AND). Returns normalized (accent-folded, lowercased) values.
 */
function parseQuery(raw: string): { isPhrase: boolean; phrase: string; words: string[] } {
  const trimmed = raw.trim();
  const isPhrase = trimmed.length >= 3 && trimmed.startsWith('"') && trimmed.endsWith('"');
  const inner = isPhrase ? trimmed.slice(1, -1) : trimmed.replace(/"/g, " ");
  const phrase = normalize(inner);
  const words = phrase.split(/\s+/).filter((w) => w.length >= 2);
  return { isPhrase, phrase, words };
}

interface SearchResult {
  id: string;
  title: string;
  href: string;
  source: string;
  category: string;
  contentType: string;
  image: string;
  date: string;
}

/**
 * Search own content (markdown + posts) in memory via getOwnArticles(). Haystack
 * is title/excerpt/category/tags (not body); ARTICLE shape/URL, id =
 * articulo-${slug}. The helper already dedups (.md wins) and orders newest-first.
 */
async function searchOwnContent(parsed: {
  isPhrase: boolean;
  phrase: string;
  words: string[];
}): Promise<SearchResult[]> {
  // Gated: A10 newsletter exclusivity window (48h) keeps the freshest
  // article out of search results while its direct URL keeps working.
  const own = await getOwnArticles({ gated: true });

  return own
    .filter((a) => {
      const haystack = normalize(
        [a.title, stripHtml(a.excerpt), a.category, a.tags.join(" ")].join(" "),
      );
      // Quoted query → exact phrase; otherwise every word must appear (AND).
      return parsed.isPhrase
        ? haystack.includes(parsed.phrase)
        : parsed.words.every((w) => haystack.includes(w));
    })
    .map((a) => ({
      id: `articulo-${a.slug}`,
      title: a.title,
      href: getContentUrl(a.slug, CONTENT_TYPES.ARTICLE),
      source: a.author,
      category: a.category,
      contentType: CONTENT_TYPES.ARTICLE,
      image: a.image || "/images/placeholder-image.webp",
      date: formatShortDate(a.date.toISOString()),
    }));
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < MIN_QUERY_LENGTH) {
    return json({ results: [] });
  }

  // Parse once (phrase vs words); bail if there's nothing searchable (e.g. `""`).
  const parsed = parseQuery(q);
  if (!parsed.phrase || (!parsed.isPhrase && parsed.words.length === 0)) {
    return json({ results: [] });
  }

  try {
    // Two sources in parallel: own content (markdown + posts) + DB news/videos.
    const [ownContent, dbRes] = await Promise.all([
      searchOwnContent(parsed),
      supabase
        .rpc("search_articles", { search_query: q, max_results: SEARCH_LIMIT })
        .select(ARTICLE_SELECT),
    ]);

    if (dbRes.error) {
      console.error("Search RPC error:", dbRes.error);
      return json({ error: "Search failed" }, 500);
    }

    const dbResults = normalizeArticles(dbRes.data).map((a) => ({
      id: a.id,
      title: a.seo_title || a.title,
      href: getContentUrl(a.slug, a.content_type),
      source: a.source_name,
      category: a.category,
      contentType: a.content_type,
      image: a.image_url || "/images/placeholder-image.webp",
      date: formatShortDate(a.published_at.toISOString()),
    }));

    // Own content first (original, high-value), then DB results, capped.
    const results = [...ownContent, ...dbResults].slice(0, SEARCH_LIMIT);

    return json({ results });
  } catch (err) {
    console.error("Unexpected search error:", err);
    return json({ error: "Internal server error" }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
