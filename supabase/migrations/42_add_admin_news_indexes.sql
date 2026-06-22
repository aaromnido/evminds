-- Migration 42: Indexes to make the admin news list scale with page size, not
-- table size.
--
-- The admin list (`/admin/noticias`) orders by `published_at DESC` and filters by
-- `archived` / `source_id` / `headline_tone`, but `articles` had NO index on any
-- of those columns. With ~4 625 rows that meant repeated full sequential scans +
-- in-memory sorts (the 2026-06-22 audit measured 18.4 M tuples read sequentially
-- and growing ~160 k every 40 min). These three btree indexes turn the list into
-- an Index Scan and kill the sort.
--
-- No CONCURRENTLY: `db push` runs each migration in a transaction (CONCURRENTLY is
-- forbidden there), and on a 4.6k-row table a plain CREATE INDEX takes a brief,
-- negligible lock. IF NOT EXISTS keeps it idempotent / re-runnable.

-- Recency ordering for every listing (public + admin) ORDER BY published_at DESC.
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON public.articles (published_at DESC);

-- The source_id filter (admin "filter by medio") and the sources !inner join.
CREATE INDEX IF NOT EXISTS idx_articles_source_id
  ON public.articles (source_id);

-- Composite for the default "Activas" view: archived = false ORDER BY published_at
-- DESC. Lets Postgres satisfy filter + sort from one index in the common case.
CREATE INDEX IF NOT EXISTS idx_articles_archived_published_at
  ON public.articles (archived, published_at DESC);

-- NOTE: headline_tone intentionally NOT indexed yet. It is a low-cardinality
-- (~4 values incl. NULL) filter that is only applied on demand; EXPLAIN after this
-- migration will decide whether it needs its own index. Deferred per the task plan.
