-- Migration 53: durable drafts for the editorial wizard (task A3, phase 2).
--
-- WHY TWO TABLES. The wizard writes one piece into one or more channels, and the
-- two channels' payloads are deeply asymmetric (Motor.es carries ten CMS-only
-- columns, EVminds carries the `posts` record fields). But the decisive reason is
-- not the null count: **the state is per channel, not per piece**. Motor.es can be
-- finished while EVminds is still being written, and rescheduling — the
-- non-negotiable requirement from the design log — is always a per-channel act.
-- One row with per-channel columns would model that with parallel flags, which is
-- the child table reinvented badly.
--
-- WHAT IS A REAL COLUMN AND WHAT IS jsonb. Both channels have a title, a body
-- (Markdown), a hero image and an expected publish day, so those are columns: the
-- in-progress list reads them without unpacking JSON. Everything channel-specific
-- lives in `payload`, which is also what absorbs Motor.es' deferred taxonomy
-- fields (`Publicar Categoría`, `Directorio`) for free if they ever come back.
-- Those values live in someone else's CMS, so they are validated in the app and
-- stored as text — never as an enum or a CHECK, which would turn their rename
-- into our failed insert.
--
-- Supersedes the `external_collaboration_drafts` sketch in older documents, which
-- only modelled the Motor.es half.

-- 1. The piece: the brief, shared by every channel it goes to.
CREATE TABLE IF NOT EXISTS public.editorial_pieces (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The brief as step ② left it. `brief_title` is what the list shows.
  brief_title  text NOT NULL,
  brief_angle  text NOT NULL DEFAULT '',
  -- Requirement R1: the documentation links, as typed. Their reading state is
  -- transient and deliberately not stored.
  reference_urls text[] NOT NULL DEFAULT '{}',
  -- The idea this came from, DENORMALIZED ON PURPOSE. No foreign key to the
  -- future `editorial_candidates`: the Ideas section must allow deleting, and a
  -- cascade would turn a tidy-up of the idea bank into the deletion of written
  -- articles. The piece has to survive its idea.
  idea_id      uuid,
  source_name  text,
  source_url   text,
  -- Which channels were chosen in step ②, in order. Drives the step indicator.
  channels     text[] NOT NULL DEFAULT '{}',
  -- Coarse on purpose: the granular state is per channel, in the child rows.
  -- 'done' = every chosen channel is closed. Nothing is ever deleted by the
  -- system: a piece is a written article, and a TTL that destroys work is a far
  -- worse failure than a long list.
  status       text NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress', 'done')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. One row per channel the piece is written for.
CREATE TABLE IF NOT EXISTS public.editorial_channel_drafts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id     uuid NOT NULL REFERENCES public.editorial_pieces(id) ON DELETE CASCADE,
  -- OUR channel identifiers (mirrors src/lib/editorial-channels.ts), so a CHECK
  -- is legitimate here — unlike anything sourced from Motor.es' CMS.
  channel      text NOT NULL CHECK (channel IN ('motor', 'evminds')),
  title        text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',        -- Markdown, the stored workspace format
  image_url    text,
  -- THE DAY, not an instant. The UI stopped asking for a time: on Motor.es their
  -- system sets it, on EVminds it is fixed at 08:00 Europe/Madrid. Storing a
  -- timestamptz here would invent precision we do not have and reintroduce the
  -- DST trap; that instant is built at publish time (phase 4).
  publish_date date,
  -- Channel-specific fields. Motor.es: listTitle, discoverTitle, metaTitle,
  -- metaDescription, lead, brand, model, sourceName, sourceUrl, tags.
  -- EVminds: slug, excerpt, category, tags, imageAlt.
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- 'draft' = still being written. Both other values are terminal and mean
  -- different things: 'done' = Motor.es closed on our side (publishing it is
  -- typing it into their CMS), 'scheduled' = a `posts` row exists.
  status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'done', 'scheduled')),
  -- The `posts` row this channel created, so re-editing a scheduled piece MOVES
  -- that article instead of silently creating a second one. SET NULL rather than
  -- CASCADE: deleting the published article must not delete the draft it came
  -- from.
  post_id      uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (piece_id, channel)
);

-- 3. Indexes for the only two access paths: the in-progress list (most recently
-- touched first) and loading a piece's channels.
CREATE INDEX IF NOT EXISTS editorial_pieces_status_updated_idx
  ON public.editorial_pieces (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS editorial_channel_drafts_piece_idx
  ON public.editorial_channel_drafts (piece_id);

-- 4. updated_at triggers (function from migration 32).
DROP TRIGGER IF EXISTS editorial_pieces_set_updated_at ON public.editorial_pieces;
CREATE TRIGGER editorial_pieces_set_updated_at
  BEFORE UPDATE ON public.editorial_pieces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS editorial_channel_drafts_set_updated_at ON public.editorial_channel_drafts;
CREATE TRIGGER editorial_channel_drafts_set_updated_at
  BEFORE UPDATE ON public.editorial_channel_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Writing into a channel touches its piece, so "last edited" is true for the
-- piece as a whole. Without this, the list would order by the brief's edit time
-- and a piece written all afternoon would sink to the bottom.
-- Deliberately NOT SECURITY DEFINER: the only writers are admins (RLS blocks
-- everyone else), so running as the caller is enough and avoids a definer
-- function that could touch any row. search_path is pinned regardless.
CREATE OR REPLACE FUNCTION public.touch_editorial_piece()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.editorial_pieces
     SET updated_at = now()
   WHERE id = COALESCE(NEW.piece_id, OLD.piece_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS editorial_channel_drafts_touch_piece ON public.editorial_channel_drafts;
CREATE TRIGGER editorial_channel_drafts_touch_piece
  AFTER INSERT OR UPDATE OR DELETE ON public.editorial_channel_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_piece();

-- 6. RLS: admin only, both tables. There is NO public-read policy on purpose —
-- these are unpublished drafts, so anon gets nothing by default-deny. /admin is
-- already behind the auth gate in src/middleware.ts, but that is not RLS: it
-- protects the pages, not the tables.
ALTER TABLE public.editorial_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_channel_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_pieces_admin_all ON public.editorial_pieces;
CREATE POLICY editorial_pieces_admin_all ON public.editorial_pieces
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS editorial_channel_drafts_admin_all ON public.editorial_channel_drafts;
CREATE POLICY editorial_channel_drafts_admin_all ON public.editorial_channel_drafts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
