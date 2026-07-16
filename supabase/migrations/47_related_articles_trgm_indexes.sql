-- Migration 47: trigram GIN indexes on the raw title/seo_title columns.
--
-- A9's related-articles feature (noticia/[slug].astro) runs up to 14
-- concurrent `title ILIKE '%term%' OR seo_title ILIKE '%term%'` queries per
-- article page view. The only existing trigram index (idx_articles_search_trgm,
-- migration 39) is on the generated `search_text` column, which does not serve
-- ILIKE on the raw `title`/`seo_title` columns — so every one of those 14
-- queries falls back to a full seq scan of `articles`. These two indexes let
-- the planner use a Bitmap Index Scan instead. Idempotent.

CREATE INDEX IF NOT EXISTS idx_articles_title_trgm
  ON public.articles USING gin (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_seo_title_trgm
  ON public.articles USING gin (seo_title extensions.gin_trgm_ops);
