-- Enable Row Level Security on public tables
-- Service role key bypasses RLS, so scraper and comments-sync are unaffected

-- Sources: public read-only
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on sources"
  ON public.sources FOR SELECT
  USING (true);

-- Articles: public read-only
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on articles"
  ON public.articles FOR SELECT
  USING (true);
