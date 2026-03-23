-- Add has_comments flag to articles table
-- Updated organically by client-side Disqus count sync
ALTER TABLE articles ADD COLUMN IF NOT EXISTS has_comments boolean NOT NULL DEFAULT false;

-- Index for filtering articles with comments
CREATE INDEX IF NOT EXISTS idx_articles_has_comments ON articles (has_comments) WHERE has_comments = true;
