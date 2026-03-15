-- Migration 1: Create sources table
-- This table stores the news sources we scrape from

CREATE TABLE IF NOT EXISTS sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  feed_url text NOT NULL,
  feed_type text NOT NULL CHECK (feed_type IN ('rss', 'html')),
  lang text NOT NULL CHECK (lang IN ('es', 'en')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE sources IS 'News sources for the EVMinds scraper';
