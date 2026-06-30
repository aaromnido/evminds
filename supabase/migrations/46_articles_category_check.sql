-- Migration 46: CHECK constraint on articles.category
--
-- Ensures articles.category only accepts the 6 closed-set values produced by
-- categorize() (supabase/functions/scrape/services/categorizer.ts) and defined
-- in src/lib/categories.ts. Prevents typos or bad data from creating phantom
-- categories that break the site's category navigation/filtering.
--
-- The set is the exact union of: categorize() outputs + existing BD values +
-- categories.ts definitions — all three are identical (verified 2026-06-30).
--
-- Idempotent: uses DO $$ ... IF NOT EXISTS ... (same pattern as mig. 41 for
-- articles_headline_tone_check). Safe to re-run or retry after a partial
-- rollback.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_category_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_category_check
      CHECK (category IN (
        'Coches eléctricos',
        'Baterías y tecnología',
        'Renovables',
        'Infraestructura de carga',
        'Legislación y ayudas',
        'Industria'
      ));
  END IF;
END $$;
