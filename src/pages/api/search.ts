import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { supabase } from "@/lib/supabase";
import { ARTICLE_SELECT, normalizeArticles } from "@/lib/article-utils";
import { getContentUrl } from "@/lib/article-url";
import { formatShortDate } from "@/lib/date-utils";
import { CONTENT_TYPES } from "@/lib/content-types";

/**
 * GET /api/search
 *
 * Hybrid keyword search for the Spotlight search modal, across two sources:
 *  1. Supabase `articles` table (news + video) via the `search_articles` RPC
 *     (pg_trgm + unaccent): partial words, typos, accents, language-agnostic.
 *  2. Own articles, which live as Astro content collections (markdown), NOT in
 *     the DB — searched in-memory here so they show up too.
 *
 * Own articles are surfaced first (original, high-value content), then the
 * ranked DB results. Both sources normalize accents the same way for
 * consistent matching.
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

/** Search the own-articles content collection (markdown) in memory. */
async function searchOwnArticles(q: string) {
  const nq = normalize(q);
  const now = new Date();
  const entries = await getCollection("articulos");

  return entries
    .filter((a) => !a.data.draft && a.data.date <= now)
    .filter((a) => {
      const haystack = normalize(
        [a.data.title, a.data.excerpt, a.data.category, (a.data.tags || []).join(" ")].join(" "),
      );
      return haystack.includes(nq);
    })
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((a) => ({
      id: `articulo-${a.id}`,
      title: a.data.title,
      href: getContentUrl(a.id, CONTENT_TYPES.ARTICLE),
      source: a.data.author,
      category: a.data.category,
      contentType: CONTENT_TYPES.ARTICLE,
      image: a.data.image || "/images/placeholder-image.webp",
      date: formatShortDate(a.data.date.toISOString()),
    }));
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < MIN_QUERY_LENGTH) {
    return json({ results: [] });
  }

  try {
    // Both sources in parallel: own markdown articles + DB news/videos.
    const [own, dbRes] = await Promise.all([
      searchOwnArticles(q),
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
      title: a.title,
      href: getContentUrl(a.slug, a.content_type),
      source: a.source_name,
      category: a.category,
      contentType: a.content_type,
      image: a.image_url || "/images/placeholder-image.webp",
      date: formatShortDate(a.published_at.toISOString()),
    }));

    // Own articles first, then DB results, capped at the overall limit.
    const results = [...own, ...dbResults].slice(0, SEARCH_LIMIT);

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
