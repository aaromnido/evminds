-- Migration 2: Create articles table with indexes
-- This table stores all scraped and processed articles

CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title text NOT NULL,
  excerpt text NOT NULL,
  image_url text,
  article_url text NOT NULL UNIQUE,
  category text NOT NULL,
  published_at timestamptz NOT NULL,
  scraped_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_scraped_at ON articles (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url ON articles (article_url);

-- Add comments for documentation
COMMENT ON TABLE articles IS 'Scraped articles from all sources, translated to Spanish';
COMMENT ON COLUMN articles.article_url IS 'Unique constraint - prevents duplicate articles';
COMMENT ON COLUMN articles.scraped_at IS 'Used for cursor-based pagination';
