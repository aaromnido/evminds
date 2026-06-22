-- Migration 44: Preventive index on posts.updated_at.
--
-- The admin posts list (`/admin/posts`) orders by `updated_at DESC` + paginates
-- 20, but `posts` only had indexes on `pkey` and `slug`. Today the table holds ~7
-- rows, so the planner correctly uses a Seq Scan + sort (a tiny-table scan is
-- cheaper than an index walk) and this index will NOT be used yet — that is
-- expected. It is "set & forget" insurance: the same class of fix as
-- idx_articles_published_at (migration 42), added now so the list keeps scaling
-- with page size as own-articles grow, without us revisiting it later.
--
-- Note: unlike `articles`, the posts create/edit forms validate `category`
-- against a hardcoded VALID_CATEGORIES constant (no full-table fetch), so no
-- categories RPC is needed here. This migration is indexes-only.
--
-- No CONCURRENTLY: `db push` wraps each migration in a transaction. IF NOT EXISTS
-- keeps it idempotent.

CREATE INDEX IF NOT EXISTS idx_posts_updated_at
  ON public.posts (updated_at DESC);
