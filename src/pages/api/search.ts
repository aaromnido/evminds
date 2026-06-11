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

/** Search the own-articles content collection (markdown) in memory. */
async function searchOwnArticles(q: string): Promise<SearchResult[]> {
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

/**
 * Search published `posts` (own content stored in the DB) in memory. Mirrors
 * searchOwnArticles: same haystack (title/excerpt/category/tags, not body),
 * same ARTICLE shape/URL, id = articulo-${slug}. RLS posts_public_read keeps
 * this to published & due rows. The hand-written Database type makes .from()
 * infer `never`, hence the localized cast (see .claude/tasks/typecheck-cleanup.md).
 */
async function searchPosts(q: string): Promise<SearchResult[]> {
  const nq = normalize(q);
  const { data, error } = await supabase
    .from("posts")
    .select("title, excerpt, category, tags, slug, author, image_url, published_at");

  if (error) {
    console.error("Search posts error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as {
    title: string;
    excerpt: string;
    category: string;
    tags: string[] | null;
    slug: string;
    author: string;
    image_url: string | null;
    published_at: string | null;
  }[];

  return rows
    .filter((p) => {
      const haystack = normalize(
        [p.title, p.excerpt, p.category, (p.tags || []).join(" ")].join(" "),
      );
      return haystack.includes(nq);
    })
    .sort(
      (a, b) =>
        new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    )
    .map((p) => ({
      id: `articulo-${p.slug}`,
      title: p.title,
      href: getContentUrl(p.slug, CONTENT_TYPES.ARTICLE),
      source: p.author,
      category: p.category,
      contentType: CONTENT_TYPES.ARTICLE,
      image: p.image_url || "/images/placeholder-image.webp",
      date: formatShortDate(p.published_at ?? new Date().toISOString()),
    }));
}

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < MIN_QUERY_LENGTH) {
    return json({ results: [] });
  }

  try {
    // Three sources in parallel: own markdown articles + own DB posts + DB news/videos.
    const [own, posts, dbRes] = await Promise.all([
      searchOwnArticles(q),
      searchPosts(q),
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

    // Merge own content (.md wins on slug collision, mirroring the listing and
    // detail page during the Fase 5 migration window), then DB news/videos.
    const ownSlugs = new Set(own.map((r) => r.id));
    const ownContent = [...own, ...posts.filter((p) => !ownSlugs.has(p.id))];

    // Own articles first, then DB results, capped at the overall limit.
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
