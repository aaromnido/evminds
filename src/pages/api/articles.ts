import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import type { ArticleWithSource } from "@/lib/database.types";
import { getSourceBySlug } from "@/lib/sources";
import { getCategoryBySlug } from "@/lib/categories";
import { API_DEFAULT_LIMIT } from "@/lib/article-utils";
import { readPrefsFromCookie } from "@/lib/preferences";

/**
 * GET /api/articles
 *
 * Fetch articles with cursor-based pagination and optional filtering
 *
 * Query params:
 * - limit: number of articles per page (default: 12)
 * - cursor: ISO timestamp for pagination (scraped_at of last article from previous page)
 * - category: filter by category (optional)
 * - source: filter by source slug (optional)
 *
 * Response:
 * - articles: ArticleWithSource[]
 * - nextCursor: string | null (null when no more articles)
 */
export const GET: APIRoute = async ({ url, request }) => {
  const MAX_LIMIT = 100;
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || String(API_DEFAULT_LIMIT), 10) || API_DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const cursor = url.searchParams.get("cursor");
  const category = url.searchParams.get("category");
  const sourceSlug = url.searchParams.get("source");

  try {
    // Resolve source once (avoid duplicate call)
    const source = sourceSlug ? await getSourceBySlug(sourceSlug) : null;

    // Read user preferences
    const prefs = readPrefsFromCookie(request.headers.get("cookie"));

    // Use !inner join when filtering by source so PostgREST excludes non-matching articles
    const needsInnerJoin = source || prefs.excludedSources.length > 0;
    const articleColumns = "id, slug, title, excerpt, image_url, article_url, category, content_type, youtube_video_id, published_at, scraped_at";
    const joinClause = needsInnerJoin
      ? `${articleColumns}, source:sources!inner(name, url)`
      : `${articleColumns}, source:sources(name, url)`;

    // Filter by content type (default: news only, /videos page sends 'video')
    const contentType = url.searchParams.get("content_type") || "news";

    let query = supabase
      .from("articles")
      .select(joinClause)
      .eq("content_type", contentType)
      .order("scraped_at", { ascending: false })
      .limit(limit);

    // Apply cursor pagination (fetch articles older than cursor)
    if (cursor) {
      query = query.lt("scraped_at", cursor);
    }

    // Apply category filter (resolve slug to name for DB query)
    if (category) {
      const cat = getCategoryBySlug(category);
      if (!cat) {
        return new Response(
          JSON.stringify({ articles: [], nextCursor: null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      query = query.eq("category", cat.name);
    }

    // Apply source filter
    if (source) {
      query = query.eq("source.name", source.name);
    }

    // Apply user preference exclusions
    if (prefs.excludedSources.length > 0) {
      for (const name of prefs.excludedSources) {
        query = query.neq("source.name", name);
      }
    }
    if (prefs.excludedCategories.length > 0) {
      query = query.not("category", "in", `(${prefs.excludedCategories.join(",")})`);
    }
    if (prefs.onlyWithComments) {
      query = query.eq("has_comments", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch articles" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Calculate next cursor (scraped_at of last article)
    const nextCursor =
      data && data.length === limit
        ? (data[data.length - 1] as any).scraped_at
        : null;

    return new Response(
      JSON.stringify({
        articles: data as ArticleWithSource[],
        nextCursor,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
