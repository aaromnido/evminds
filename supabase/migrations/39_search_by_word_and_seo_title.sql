-- Migration 39: search by word (not whole-phrase) and include seo_title.
--
-- Fixes two search defects surfaced after adding seo_title:
--  1. The RPC matched the ENTIRE query as one contiguous substring
--     (ILIKE '%full query%'), so any multi-word natural query returned nothing
--     ("avances en baterias de silicio" → 0 results). Now it matches per word
--     (AND), with a trigram fuzzy fallback so typos/plurals still match.
--  2. search_text didn't include seo_title, so the SEO keywords weren't searched.
--
-- A generation expression can't be altered in place, so search_text is dropped
-- and re-added (which rebuilds it for every row); its dependent GIN trigram index
-- is dropped with it and recreated. Idempotent.

-- 1. Rebuild search_text to also include seo_title.
DROP INDEX IF EXISTS public.idx_articles_search_trgm;
ALTER TABLE public.articles DROP COLUMN IF EXISTS search_text;
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    public.f_unaccent(
      lower(
        coalesce(title, '') || ' ' ||
        coalesce(seo_title, '') || ' ' ||
        coalesce(excerpt, '') || ' ' ||
        coalesce(ai_summary, '')
      )
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_articles_search_trgm
  ON public.articles USING gin (search_text extensions.gin_trgm_ops);

-- 2. Redefine the search RPC: per-word matching (AND) instead of a whole-phrase
--    substring. A row qualifies only if EVERY query token (>=2 chars, accent-
--    folded) is present as a substring OR is trigram-similar (word_similarity
--    >= 0.5) to some span of search_text — so plurals/typos ("avances" ~
--    "avance") still match. Ranking unchanged: full-query similarity, then recency.
CREATE OR REPLACE FUNCTION public.search_articles(search_query text, max_results int DEFAULT 10)
  RETURNS SETOF public.articles
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT a.*
  FROM public.articles a
  WHERE NOT EXISTS (
    SELECT 1
    FROM unnest(string_to_array(public.f_unaccent(lower(search_query)), ' ')) AS tok
    WHERE length(tok) >= 2
      AND a.search_text NOT ILIKE '%' || tok || '%'
      AND extensions.word_similarity(tok, a.search_text) < 0.5
  )
  ORDER BY
    extensions.word_similarity(public.f_unaccent(lower(search_query)), a.search_text) DESC,
    a.published_at DESC
  LIMIT greatest(1, least(coalesce(max_results, 10), 50))
$$;

-- Anon (PostgREST public role) calls this RPC from the search endpoint.
GRANT EXECUTE ON FUNCTION public.search_articles(text, int) TO anon, authenticated;
