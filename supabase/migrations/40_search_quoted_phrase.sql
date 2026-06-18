-- Migration 40: quoted queries = exact-phrase search.
--
-- Extends search_articles: when the whole query is wrapped in double quotes
-- ("avances en silicio"), match the inner phrase as a contiguous substring
-- (literal, like Google). Otherwise keep the per-word AND + trigram behaviour
-- from migration 39. Only the RPC changes; search_text / index are untouched.

CREATE OR REPLACE FUNCTION public.search_articles(search_query text, max_results int DEFAULT 10)
  RETURNS SETOF public.articles
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  WITH q AS (
    SELECT
      -- Phrase mode: the entire (trimmed) query is wrapped in double quotes.
      (btrim(search_query) ~ '^".+"$') AS is_phrase,
      -- Inner phrase, quotes stripped, accent-folded + lowercased.
      public.f_unaccent(lower(btrim(btrim(search_query), '"'))) AS phrase,
      -- Word mode: stray quotes turned into spaces so they don't pollute tokens.
      public.f_unaccent(lower(translate(search_query, '"', ' '))) AS words
  )
  SELECT a.*
  FROM public.articles a, q
  WHERE
    CASE WHEN q.is_phrase THEN
      a.search_text ILIKE '%' || q.phrase || '%'
    ELSE
      NOT EXISTS (
        SELECT 1
        FROM unnest(string_to_array(q.words, ' ')) AS tok
        WHERE length(tok) >= 2
          AND a.search_text NOT ILIKE '%' || tok || '%'
          AND extensions.word_similarity(tok, a.search_text) < 0.5
      )
    END
  ORDER BY
    extensions.word_similarity(
      CASE WHEN q.is_phrase THEN q.phrase ELSE q.words END,
      a.search_text
    ) DESC,
    a.published_at DESC
  LIMIT greatest(1, least(coalesce(max_results, 10), 50))
$$;

GRANT EXECUTE ON FUNCTION public.search_articles(text, int) TO anon, authenticated;
