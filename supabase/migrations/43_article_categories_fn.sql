-- Migration 43: get_article_categories() — distinct category list for the admin
-- create/edit datalists.
--
-- The create (`new.astro`) and edit (`[id]/edit.astro`) forms built their
-- "category" <datalist> by SELECTing the `category` column of EVERY article
-- (~4 625 rows) and de-duplicating in JS. The 2026-06-22 audit measured that
-- fetch at 14.5 % of total DB time (9 098+ calls) — the single biggest avoidable
-- DB cost and the reason create/edit felt slower than the 20-row list.
--
-- This RPC pushes the DISTINCT into Postgres (which can satisfy it from the
-- existing idx_articles_category index) and returns the ~10 unique values, sorted,
-- already filtered of NULL/empty. PostgREST exposes it as supabase.rpc(...).
--
-- SECURITY INVOKER (default): only the authenticated admin calls it, and admin RLS
-- already grants full read of articles, so it returns every distinct category.
-- STABLE + empty search_path mirror the house style of search_articles (mig. 29).
-- CREATE OR REPLACE keeps the migration idempotent / re-runnable.

CREATE OR REPLACE FUNCTION public.get_article_categories()
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT DISTINCT category
  FROM public.articles
  WHERE category IS NOT NULL AND category <> ''
  ORDER BY category
$$;

-- Admin-only feature; the admin pages use the authenticated Supabase client.
GRANT EXECUTE ON FUNCTION public.get_article_categories() TO authenticated;
