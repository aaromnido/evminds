-- Migration 49: extend get_article_categories() with an optional content_type
-- filter, and open it to `anon`.
--
-- Public pages (index.astro, videos.astro, categoria/[slug].astro) built their
-- category-filter pills with `SELECT category FROM articles WHERE content_type
-- = $1`, fetching EVERY matching row (thousands) just to dedupe client-side.
-- 5.4% of total DB time (4 095 calls, 72ms mean) per the 2026-07-16 diagnosis
-- (see task doc task-related-articles-db-load.md, secondary offender).
--
-- SECURITY INVOKER (unchanged, default) is correct here — unlike migration
-- 48's related_articles_pool, this filters on `content_type = $1`, which uses
-- the leakproof `=` operator, not ILIKE. RLS's non-leakproof-pushdown
-- restriction (see migration 48's comment) never applies to a leakproof
-- operator, so Postgres can push the equality filter below/into an index scan
-- for `anon` exactly as it would without RLS. No DEFINER pivot needed here.
--
-- CREATE OR REPLACE cannot change a function's parameter list, so the old
-- zero-argument signature is dropped explicitly first. Without this, both
-- get_article_categories() and get_article_categories(text DEFAULT NULL)
-- would exist at once, and a zero-argument call (as both admin call sites
-- still make) becomes ambiguous ("function ... is not unique"). Idempotent:
-- on a re-run only the new single-argument signature exists, and dropping it
-- by bare name is unambiguous since there is exactly one match.
DROP FUNCTION IF EXISTS public.get_article_categories();

-- p_content_type DEFAULT NULL preserves the existing admin behavior exactly:
-- both admin call sites (noticias/new.astro, noticias/[id]/edit.astro) call
-- this with no argument, so p_content_type stays NULL and every distinct
-- category is returned, unfiltered, same as before this migration.
CREATE FUNCTION public.get_article_categories(p_content_type text DEFAULT NULL)
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT DISTINCT category
  FROM public.articles
  WHERE category IS NOT NULL AND category <> ''
    AND (p_content_type IS NULL OR content_type = p_content_type)
  ORDER BY category
$$;

-- Admin keeps using the authenticated client; public pages now call this too.
GRANT EXECUTE ON FUNCTION public.get_article_categories(text) TO anon, authenticated;
