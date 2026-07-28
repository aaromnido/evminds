-- Migration 54: the curator's idea bank (task A3, phase 5).
--
-- PERSISTENCE MODEL (Fer, 2026-07-25, restated 2026-07-28 when this table was
-- actually built). Only three things are meant to survive: ideas picked to
-- write, ideas explicitly saved, and Fer's own ideas. A freshly generated batch
-- is `pending` and is transient in spirit — but "transient" turned out not to
-- mean "never written": each real curator call is a paid Gemini request, and
-- calling it on every single page visit would be wasteful. So `pending` rows
-- ARE persisted, as a one-day cache: `expires_at` (48h after `fetched_at`) is
-- when a batch stops being reused and a fresh one is generated instead. Nothing
-- reads `pending` rows as durable content — they are a cache with a shelf life,
-- not a record.
--
-- WHAT "DISCARDED" MEANS. Fer chose (2026-07-28) not to remember explicit
-- dismissals: a discarded proposal can resurface in a later batch if the
-- underlying article is still within the curator's recency window. So there is
-- no `rejected` row ever written — a dismissed `pending` row is deleted outright,
-- same as the prototype's in-memory behaviour. Real dedup — never re-proposing
-- something already picked or saved — comes from checking `source_url` against
-- THIS table's own `picked`/`saved` rows, not from a separate log.
--
-- WHAT "EXPIRED" MEANS. A `pending` row that is not saved by the time its batch
-- is replaced (regenerated, or its `expires_at` has passed) becomes `expired`,
-- not deleted — `PickIdeaStep.tsx` already renders an "Ya escritas o caducadas"
-- history view that expects these rows to still exist.

CREATE TABLE IF NOT EXISTS public.editorial_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'own' ideas have no source article to ground on; see the CHECK below.
  origin            text NOT NULL CHECK (origin IN ('curator', 'own')),
  source_url        text,
  source_title      text,
  source_name       text,
  source_excerpt    text,
  proposed_title_es text NOT NULL,
  angle             text NOT NULL,
  rationale         text NOT NULL DEFAULT '',
  -- Requirement R1, same shape as editorial_pieces.reference_urls: extra links
  -- typed when creating an idea by hand. Empty for curator-origin ideas.
  reference_urls    text[] NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'picked', 'saved', 'expired')),
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  picked_at         timestamptz,
  -- Only meaningful while status = 'pending'. NULL for picked/saved/own rows,
  -- which never expire on their own — deletion is manual, same rule as pieces.
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- A curator-origin idea always has a source; an own idea never does. Catches
  -- a curator row inserted without one, which would otherwise silently show as
  -- a sourceless card.
  CONSTRAINT editorial_candidates_origin_source_chk CHECK (
    (origin = 'own' AND source_url IS NULL)
    OR (origin = 'curator' AND source_url IS NOT NULL)
  )
);

-- Access paths: the pending batch (status + freshness), dedup lookups by
-- source_url, and "Guardadas y propias" ordered newest-first.
CREATE INDEX IF NOT EXISTS editorial_candidates_status_idx
  ON public.editorial_candidates (status);
CREATE INDEX IF NOT EXISTS editorial_candidates_source_url_idx
  ON public.editorial_candidates (source_url);
CREATE INDEX IF NOT EXISTS editorial_candidates_created_idx
  ON public.editorial_candidates (created_at DESC);

-- RLS: admin only, same shape as migration 53. No public-read policy — these
-- are unpublished idea proposals, so anon gets nothing by default-deny.
ALTER TABLE public.editorial_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_candidates_admin_all ON public.editorial_candidates;
CREATE POLICY editorial_candidates_admin_all ON public.editorial_candidates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
