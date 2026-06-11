-- Soft-delete column for scraped news (Fase 4 CMS).
-- Hard-deleting an article whose URL is still in the source feed would be
-- resurrected on the next scrape (the scraper is insert-only and skips by
-- article_url), so deletion is modelled as archived = true instead.
--
-- NOTE: This migration is ADDITIVE only. The public-read RLS policy that
-- actually HIDES archived rows from anon is deferred to Fase 6 (it requires
-- dropping/recreating the live "Allow public read access on articles" policy,
-- the single riskiest change in this plan). Until then `archived` exists but
-- nothing sets it true, so behaviour is unchanged.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
