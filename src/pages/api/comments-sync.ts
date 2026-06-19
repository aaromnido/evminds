import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/comments-sync
 *
 * Called by client-side JS when Disqus reports articles with comments.
 * Marks those articles as has_comments = true in the database.
 *
 * Body: { ids: string[] }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { ids } = await request.json();

    // Keep only real article UUIDs. News/videos use the article UUID as their
    // Disqus identifier, but own articles use `articulo-<slug>` (markdown posts
    // with no DB row), which would crash the uuid `.in("id", …)` cast (22P02).
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const articleIds = Array.isArray(ids)
      ? ids.filter((id) => typeof id === "string" && UUID_RE.test(id))
      : [];

    if (articleIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, updated: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only update articles that aren't already marked (avoid unnecessary writes)
    const { count, error } = await supabase
      .from("articles")
      .update({ has_comments: true })
      .in("id", articleIds)
      .eq("has_comments", false);

    if (error) {
      console.error("comments-sync error:", error);
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, updated: count || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("comments-sync error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
