-- Migration 37: swap the public-read policy on `articles` to be archived-aware (Fase 6a).
--
-- Until now the public read policy was `USING (true)` (named "Allow public read
-- access on articles"), so once admin soft-deletes set archived=true those rows
-- would still leak to the public site (RLS is OR-combined, the permissive policy
-- wins). This drops it and replaces it with an archived-aware read policy plus an
-- admin-write policy.
--
-- Effect on the public site: anon now sees only `archived = false`. The ~20 public
-- call sites need NO change — RLS filters automatically. `search_articles` is NOT
-- SECURITY DEFINER (verified: prosecdef = f), so the RPC inherits this too. Admin
-- context (is_admin()) keeps seeing every row, archived included.
--
-- The existing service_role insert/update policies are left untouched (the scraper
-- runs as service_role, which bypasses RLS regardless). Idempotent: drops by name
-- before creating, so a re-run or partial-retry is safe.

-- Old permissive read policy (USING true) — drop by its REAL name.
drop policy if exists "Allow public read access on articles" on public.articles;

-- Recreate cleanly (idempotent).
drop policy if exists articles_public_read on public.articles;
drop policy if exists articles_admin_write on public.articles;

-- Anon sees only non-archived rows; admins see everything.
create policy articles_public_read on public.articles
  for select using (archived = false or public.is_admin());

-- Admins can do everything (edit, soft-delete via archived, manual insert).
create policy articles_admin_write on public.articles
  for all using (public.is_admin()) with check (public.is_admin());
