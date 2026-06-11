-- Posts table: own original content (Fase 4 CMS).
-- Mirrors the current `articulos` content collection (src/content.config.ts),
-- but decoupled from the scraper's `articles` table. Public URL stays
-- /articulo/{slug}, so slugs migrate 1:1 from the .md filenames (Fase 5).
--
-- Scheduling: NO 'scheduled' status and NO cron. A scheduled post is just
-- status='published' with a future published_at; the public-read policy
-- (published_at <= now()) reveals it automatically when due.

CREATE TABLE IF NOT EXISTS public.posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  excerpt      text NOT NULL,
  content      text NOT NULL,                       -- rich HTML body
  image_url    text,
  image_alt    text,
  category     text NOT NULL,
  tags         text[] NOT NULL DEFAULT '{}',
  author       text NOT NULL DEFAULT 'EVMinds',
  status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  has_comments boolean NOT NULL DEFAULT false
);

-- updated_at trigger (function defined in migration 32)
DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: anon sees only published & due; admins do everything.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_public_read ON public.posts;
CREATE POLICY posts_public_read ON public.posts
  FOR SELECT USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS posts_admin_all ON public.posts;
CREATE POLICY posts_admin_all ON public.posts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
