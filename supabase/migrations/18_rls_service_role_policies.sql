-- Add INSERT/UPDATE policies for service_role on tables with RLS enabled.
-- service_role should bypass RLS automatically, but explicit policies
-- act as a safety net for Edge Functions (scraper, comments-sync).

-- Articles: allow service_role to insert and update
CREATE POLICY "Allow service_role insert on articles"
  ON public.articles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service_role update on articles"
  ON public.articles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sources: allow service_role to insert and update
CREATE POLICY "Allow service_role insert on sources"
  ON public.sources FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service_role update on sources"
  ON public.sources FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
