-- A12: "Medios de Confianza" — per-article headline tone classification.
--
-- A 3-way traffic-light label for each article's ORIGINAL headline, produced by
-- the existing scrape-time Gemini call (one extra schema field). The AI only
-- CLASSIFIES into green/amber/red; the per-source score is plain arithmetic
-- computed in the app, never graded by the AI.
--
-- Nullable, no default, no backfill (same criterion as seo_title): old rows stay
-- NULL = "not yet classified" (⚪) and render no color until classified forward
-- or set by hand from the admin editor. Fully idempotent.

-- 1. Tone column on articles.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS headline_tone text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_headline_tone_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_headline_tone_check
      CHECK (headline_tone IN ('green', 'amber', 'red'));
  END IF;
END $$;

-- 2. Per-source aggregation RPC for the public ranking.
--
-- Returns one row per source with its tone counts within a time window
-- [p_since, now]. Grouping/filtering happens in Postgres (efficient with many
-- articles); the score, the color mapping, the minimum-sample threshold (⚪) and
-- the annual award are all computed in TypeScript from these raw counts.
-- Archived and unclassified articles are excluded. p_since drives the public
-- page's filter (24h / week / month / year — "year" = Jan 1 of the current year).
CREATE OR REPLACE FUNCTION public.source_headline_ranking(p_since timestamptz)
  RETURNS TABLE (
    source_id uuid,
    source_name text,
    n_green bigint,
    n_amber bigint,
    n_red bigint,
    n_total bigint
  )
  LANGUAGE sql
  STABLE
  SET search_path = ''
AS $$
  SELECT
    a.source_id,
    s.name AS source_name,
    count(*) FILTER (WHERE a.headline_tone = 'green') AS n_green,
    count(*) FILTER (WHERE a.headline_tone = 'amber') AS n_amber,
    count(*) FILTER (WHERE a.headline_tone = 'red')   AS n_red,
    count(*) AS n_total
  FROM public.articles a
  JOIN public.sources s ON s.id = a.source_id
  WHERE a.headline_tone IS NOT NULL
    AND a.archived = false
    AND a.published_at >= p_since
  GROUP BY a.source_id, s.name
$$;

-- Anon (PostgREST public role) calls this RPC from the public ranking page.
GRANT EXECUTE ON FUNCTION public.source_headline_ranking(timestamptz) TO anon, authenticated;
