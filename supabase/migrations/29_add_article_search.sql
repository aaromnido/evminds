-- Migration 29: Full-text-ish search over articles using trigrams + unaccent.
--
-- Adds keyword search across title + excerpt + ai_summary for the Spotlight-style
-- search modal. Uses pg_trgm (trigram similarity) instead of tsvector FTS because
-- the search is "as you type": it must tolerate partial words and typos (e.g.
-- "tesl", "cupra bor") and stay language-agnostic for bilingual ES/EN content.
--
-- Coverage: the RPC does NOT filter by content_type, so it searches all three
-- types (news, video, article) that share the articles table.

-- 1. Extensions (Supabase keeps them in the `extensions` schema)
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. IMMUTABLE wrapper around unaccent so it can be used in a generated column.
--    The two-arg form pins the dictionary explicitly, making it deterministic and
--    independent of search_path (required for IMMUTABLE / generated columns).
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
  SET search_path = ''
AS $$
  SELECT extensions.unaccent('extensions.unaccent', $1)
$$;

-- 3. Pre-normalized search column: lowercased, accent-stripped concatenation of
--    the searchable text fields. STORED so the trigram index can sit on it.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    public.f_unaccent(
      lower(
        coalesce(title, '') || ' ' ||
        coalesce(excerpt, '') || ' ' ||
        coalesce(ai_summary, '')
      )
    )
  ) STORED;

-- 4. GIN trigram index — accelerates ILIKE '%term%' (substring) and similarity().
CREATE INDEX IF NOT EXISTS idx_articles_search_trgm
  ON public.articles USING gin (search_text extensions.gin_trgm_ops);

-- 5. Search RPC: normalizes the user's query the same way as the column, matches
--    by substring, and ranks by trigram word_similarity, then recency.
CREATE OR REPLACE FUNCTION public.search_articles(search_query text, max_results int DEFAULT 10)
  RETURNS SETOF public.articles
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT a.*
  FROM public.articles a
  WHERE a.search_text ILIKE '%' || public.f_unaccent(lower(search_query)) || '%'
  ORDER BY
    extensions.word_similarity(public.f_unaccent(lower(search_query)), a.search_text) DESC,
    a.published_at DESC
  LIMIT greatest(1, least(coalesce(max_results, 10), 50))
$$;

-- Anon (PostgREST public role) calls this RPC from the search endpoint.
-- It is SECURITY INVOKER + STABLE, so RLS on articles still applies.
GRANT EXECUTE ON FUNCTION public.search_articles(text, int) TO anon, authenticated;
