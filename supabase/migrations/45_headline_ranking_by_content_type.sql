-- A12: "Medios de Confianza" — split the per-source ranking by content type.
--
-- The public page gains a second filter (Todos / Noticias / Vídeos) alongside the
-- time-window one. Rather than fire one RPC per (window × type) combination, the
-- aggregation returns the tone counts broken down by content_type so the three
-- views are derived in TypeScript from the same four window queries:
--   Todos    = the n_* columns (all content types, unchanged → backward compatible)
--   Vídeos   = the n_*_video columns (content_type = 'video')
--   Noticias = Todos − Vídeos (everything that isn't a video)
--
-- Keeping the original n_* columns as the full total means existing callers and
-- the "Todos" view need no change, and any future content_type (e.g. 'blog')
-- folds into Todos/Noticias automatically. Fully idempotent.

-- Adding columns to RETURNS TABLE changes the function's return type, which
-- CREATE OR REPLACE cannot do — drop the old signature first (idempotent).
DROP FUNCTION IF EXISTS public.source_headline_ranking(timestamptz);

CREATE OR REPLACE FUNCTION public.source_headline_ranking(p_since timestamptz)
  RETURNS TABLE (
    source_id uuid,
    source_name text,
    n_green bigint,
    n_amber bigint,
    n_red bigint,
    n_total bigint,
    n_green_video bigint,
    n_amber_video bigint,
    n_red_video bigint,
    n_total_video bigint
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
    count(*) AS n_total,
    count(*) FILTER (WHERE a.headline_tone = 'green' AND a.content_type = 'video') AS n_green_video,
    count(*) FILTER (WHERE a.headline_tone = 'amber' AND a.content_type = 'video') AS n_amber_video,
    count(*) FILTER (WHERE a.headline_tone = 'red'   AND a.content_type = 'video') AS n_red_video,
    count(*) FILTER (WHERE a.content_type = 'video') AS n_total_video
  FROM public.articles a
  JOIN public.sources s ON s.id = a.source_id
  WHERE a.headline_tone IS NOT NULL
    AND a.archived = false
    AND a.published_at >= p_since
  GROUP BY a.source_id, s.name
$$;

GRANT EXECUTE ON FUNCTION public.source_headline_ranking(timestamptz) TO anon, authenticated;
