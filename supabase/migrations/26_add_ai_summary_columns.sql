-- Migration 26: AI-generated summary + transparency warnings for scraped articles
-- Populated by the scrape Edge Function via Gemini Flash 2.0.
-- All columns nullable so legacy rows and Gemini-failure rows stay valid.

ALTER TABLE articles
  ADD COLUMN ai_summary text,
  ADD COLUMN ai_warnings jsonb,
  ADD COLUMN ai_generated_at timestamptz;

-- Partial index: only rows that have a summary. Useful for analytics
-- ("what % of articles have AI content?") without bloating the index
-- with the 3.5k legacy NULL rows.
CREATE INDEX IF NOT EXISTS idx_articles_ai_generated_at
  ON articles (ai_generated_at)
  WHERE ai_generated_at IS NOT NULL;
