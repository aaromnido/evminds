-- Migration 48: consolidate A9's 14 per-term ILIKE queries into one RPC.
--
-- noticia/[slug].astro fired up to 14 concurrent `title ILIKE OR seo_title
-- ILIKE` queries per article view (one per search term, Promise.all), each a
-- full seq scan of `articles` — 64% of total DB time (see task doc). Migration
-- 47 added trigram GIN indexes on the raw title/seo_title columns to fix that,
-- but they turned out to be UNUSABLE by the `anon` role: `articles` has RLS
-- enabled (articles_public_read, migration 37), and PostgreSQL will not push a
-- non-leakproof qual below/alongside a row-security qual (see "Row Security
-- Policies" in the Postgres docs). ILIKE's underlying operator (`~~*` /
-- texticlike) is NOT leakproof, so under RLS the planner refuses to use the
-- trgm indexes at all and falls back to a full Seq Scan for `anon` — verified
-- with EXPLAIN (ANALYZE, BUFFERS): same query costs ~9ms/38 buffers without
-- RLS (bitmap heap scan) vs ~20-40ms/1000+ buffers as `anon` (seq scan),
-- worst case scanning all ~5.8k rows for rare/zero-match terms.
--
-- Fix: this function is SECURITY DEFINER (unlike search_articles, migration
-- 39, which is INVOKER) so it runs as its owner, who bypasses RLS entirely —
-- no security-barrier qual is injected, so the trgm indexes ARE usable. To
-- keep the security guarantee RLS would have provided (migration 37: anon
-- never sees archived articles), `archived = false` is hardcoded into the
-- query below — not parametrized, not conditional on caller identity. This
-- function is exclusively the public related-articles pool: it must NEVER
-- return archived articles, to anon OR to an authenticated admin. That's a
-- deliberate, narrower guarantee than RLS gives elsewhere in this codebase,
-- not a relaxation of it.
--
-- Per-term LIMIT (not one shared LIMIT across all terms): a combined query's
-- LIMIT is filled by whichever term matches most often and most recently, so
-- a common term (e.g. "tesla") starves a rarer, more specific one (e.g.
-- "degradacion") out of the result window entirely — confirmed during A9
-- manual QA. LATERAL with a per-term LIMIT guarantees every term gets its own
-- shot at contributing candidates, same as the original 14-query behavior.
--
-- Dedup: intentionally NOT done in SQL (no DISTINCT ON) — duplicate rows
-- across terms are returned as-is and left for the app's existing
-- candidatesById Map to dedupe by id, exactly like the current
-- flatMap-14-results code already does. Simpler, and behavior-identical.
--
-- The inner `OFFSET 0` is an optimization fence, not dead code: without it,
-- Postgres still prefers the pre-existing idx_articles_scraped_at (recency)
-- index for the ORDER BY + LIMIT below over the new trgm indexes, even here
-- with RLS out of the picture — for a table this small, "scan in recency
-- order and filter until N match" looks cheaper to the planner than a bitmap
-- scan + explicit sort, which is disastrous for a rare/zero-match term (has
-- to walk close to the whole table to prove there's nothing left). Verified
-- with EXPLAIN (ANALYZE, BUFFERS): 8109 buffers for 4 terms without the
-- fence vs 650 with it (~92% fewer heap/index pages touched), because OFFSET
-- 0 blocks Postgres from pulling the inner filter up into the outer ORDER
-- BY/LIMIT, forcing it to resolve the ILIKE filter (now via the trgm bitmap
-- indexes) before sorting the (small) matched set.
CREATE OR REPLACE FUNCTION public.related_articles_pool(
  p_article_id uuid,
  p_terms text[],
  p_per_term int
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  seo_title text,
  excerpt text,
  image_url text,
  article_url text,
  category text,
  content_type text,
  youtube_video_id text,
  published_at timestamptz,
  scraped_at timestamptz,
  source_name text,
  source_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.slug, a.title, a.seo_title, a.excerpt, a.image_url, a.article_url,
    a.category, a.content_type, a.youtube_video_id, a.published_at, a.scraped_at,
    s.name AS source_name, s.url AS source_url
  FROM unnest(p_terms) AS t(term)
  CROSS JOIN LATERAL (
    SELECT * FROM (
      SELECT *
      FROM public.articles a
      WHERE a.id <> p_article_id
        AND a.archived = false
        AND (a.title ILIKE '%' || t.term || '%' OR a.seo_title ILIKE '%' || t.term || '%')
      OFFSET 0
    ) matched
    ORDER BY scraped_at DESC
    LIMIT p_per_term
  ) a
  JOIN public.sources s ON s.id = a.source_id
$$;

REVOKE EXECUTE ON FUNCTION public.related_articles_pool(uuid, text[], int) FROM public;
GRANT EXECUTE ON FUNCTION public.related_articles_pool(uuid, text[], int) TO anon, authenticated;
