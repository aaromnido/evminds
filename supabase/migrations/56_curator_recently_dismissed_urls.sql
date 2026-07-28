-- Migration 56: short-lived memory of recently-dismissed source articles
-- (task A3, phase 5 follow-up, 2026-07-29).
--
-- WHY. "Volver a generar" was re-proposing the exact same article a user had
-- just dismissed a moment earlier: `dismiss-idea.ts` hard-deletes a `pending`
-- row (migration 54's own design — discards were never meant to be
-- remembered), so the article's `source_url` was still eligible input for
-- the very next curator call. Fer confirmed (2026-07-29) that this is a
-- narrower, acceptable exception to that rule: not "remember discards
-- forever", just "don't immediately re-show what was just turned down".
--
-- This table is NOT part of the idea bank. It is never read by the Ideas
-- section or step ①'s history — it exists purely so `curate-ideas.ts` can
-- exclude these URLs from the article pool for a short window (the same 48h
-- shelf life a batch already has). A stale row is simply ignored by the age
-- filter at read time; no cleanup job is needed for a table this small.
CREATE TABLE IF NOT EXISTS public.editorial_dismissed_urls (
  source_url   text PRIMARY KEY,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_dismissed_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_dismissed_urls_admin_all ON public.editorial_dismissed_urls;
CREATE POLICY editorial_dismissed_urls_admin_all ON public.editorial_dismissed_urls
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
