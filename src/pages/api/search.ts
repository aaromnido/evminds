import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import { ARTICLE_SELECT, normalizeArticles } from "@/lib/article-utils";
import { getContentUrl } from "@/lib/article-url";
import { formatShortDate } from "@/lib/date-utils";

/**
 * GET /api/search
 *
 * Keyword search across articles (news + video + article) for the Spotlight
 * search modal. Backed by the `search_articles` Postgres RPC (pg_trgm + unaccent),
 * so it tolerates partial words, typos and accents, and is language-agnostic.
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

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < MIN_QUERY_LENGTH) {
    return json({ results: [] });
  }

  try {
    // RPC returns `setof articles`; embed the source via the shared select so the
    // result shape matches the feed and we can reuse normalizeArticle().
    const { data, error } = await supabase
      .rpc("search_articles", { search_query: q, max_results: SEARCH_LIMIT })
      .select(ARTICLE_SELECT);

    if (error) {
      console.error("Search RPC error:", error);
      return json({ error: "Search failed" }, 500);
    }

    const results = normalizeArticles(data).map((a) => ({
      id: a.id,
      title: a.title,
      href: getContentUrl(a.slug, a.content_type),
      source: a.source_name,
      category: a.category,
      contentType: a.content_type,
      image: a.image_url || "/images/placeholder-image.webp",
      date: formatShortDate(a.published_at.toISOString()),
    }));

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
