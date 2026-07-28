-- Migration 55: fuzzy dedup helper for the curator (task A3, phase 5).
--
-- WHY THIS EXISTS. The curator's cheap dedup (excluding an article whose exact
-- URL was already picked/saved) only catches the same story from the same
-- outlet. It says nothing about a different outlet covering the same topic, or
-- about a proposed Spanish title that happens to restate something we already
-- published under a different source article entirely. Only a fuzzy match on
-- the SPANISH title can catch that — which is why this compares
-- `proposed_title_es` (Gemini's output) against `posts.title`, not the raw
-- English article titles the curator reads from `articles`. Same technique
-- `search_articles` already uses (migrations 39/40): word_similarity on
-- accent-folded, lowercased text.
--
-- Returns the SUBSET of `candidate_titles` that collide with something already
-- published in the last `days` days — the caller drops those before persisting.
CREATE OR REPLACE FUNCTION public.covered_post_titles(
  candidate_titles text[],
  days int DEFAULT 7,
  threshold real DEFAULT 0.45
)
  RETURNS text[]
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT coalesce(array_agg(DISTINCT ct), '{}')
  FROM unnest(candidate_titles) AS ct
  WHERE EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.status = 'published'
      AND p.published_at >= now() - (greatest(days, 0) || ' days')::interval
      AND extensions.word_similarity(
            public.f_unaccent(lower(ct)),
            public.f_unaccent(lower(p.title))
          ) >= threshold
  )
$$;

-- Called from the admin-only curate-ideas proxy (authenticated via
-- locals.supabase, RLS-bound), never from anon — but the function only reads
-- `posts.title`/`status`/`published_at`, all public info once published, so a
-- broader grant would be harmless. Kept to authenticated to match how the rest
-- of the editorial pipeline is scoped.
GRANT EXECUTE ON FUNCTION public.covered_post_titles(text[], int, real) TO authenticated;
