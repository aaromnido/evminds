import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import type { ArticleWithSource } from "@/lib/database.types";
import { getSourceBySlug } from "@/lib/sources";

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
export const GET: APIRoute = async ({ url }) => {
  const limit = parseInt(url.searchParams.get("limit") || "12", 10);
  const cursor = url.searchParams.get("cursor");
  const category = url.searchParams.get("category");
  const sourceSlug = url.searchParams.get("source");

  try {
    // Resolve source once (avoid duplicate call)
    const source = sourceSlug ? await getSourceBySlug(sourceSlug) : null;

    // Use !inner join when filtering by source so PostgREST excludes non-matching articles
    const articleColumns = "id, slug, title, excerpt, image_url, article_url, category, published_at, scraped_at";
    const joinClause = source
      ? `${articleColumns}, source:sources!inner(name, url)`
      : `${articleColumns}, source:sources(name, url)`;

    let query = supabase
      .from("articles")
      .select(joinClause)
      .order("scraped_at", { ascending: false })
      .limit(limit);

    // Apply cursor pagination (fetch articles older than cursor)
    if (cursor) {
      query = query.lt("scraped_at", cursor);
    }

    // Apply category filter
    if (category) {
      query = query.eq("category", category);
    }

    // Apply source filter
    if (source) {
      query = query.eq("source.name", source.name);
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
        ? data[data.length - 1].scraped_at
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
