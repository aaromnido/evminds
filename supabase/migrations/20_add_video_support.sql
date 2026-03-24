-- Migration 20: Add video content support
-- Adds content_type field to articles for multi-content (news, video, future blog)
-- Adds YouTube-specific fields and expands feed_type for sources

-- 1. Extend articles table with content type and YouTube fields
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'news',
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS duration text;

-- 2. Index for filtering by content type (used in /videos page and home queries)
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles (content_type);

-- 3. Expand feed_type CHECK constraint to include 'youtube'
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_feed_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_feed_type_check
  CHECK (feed_type IN ('rss', 'html', 'youtube'));

-- 4. Add YouTube channels as sources (active=false until UI is ready)
-- EV-dedicated channels (all content scraped)
INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  ('bjornnyland', 'https://www.youtube.com/@bjornnyland', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCG1QcV31eoSaX4rE8avQL4A', 'youtube', 'en', false),
  ('somoselectricos-yt', 'https://www.youtube.com/@SomosElectricos', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCj7yNF8i_EfEDgUHW7GDr7Q', 'youtube', 'es', false),
  ('todoselectricos', 'https://www.youtube.com/@TodosElectricos', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCw6NrgPij8jXaVtXiQ6j0vw', 'youtube', 'es', false),
  ('electromiaumiau', 'https://www.youtube.com/@electromiaumiau', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCoKq-4DZBynHCya3LYEzRBA', 'youtube', 'es', false),
  ('electrifyingcom', 'https://www.youtube.com/@Electrifyingcom', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC29JbxEwr7q5bP7ANJMSqAg', 'youtube', 'en', false),
  ('ferranmenescal', 'https://www.youtube.com/@ferranmenescal', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqTjybJY3I-sm0cc7Y4l9aQ', 'youtube', 'es', false),
  ('kmelectricos', 'https://www.youtube.com/@KmElectricos', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCUigQMFqRZmenFb3dsORXyw', 'youtube', 'es', false),
  ('testcoches', 'https://www.youtube.com/@TestCoches', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCGd6AQd1pZQfPKcPXMPTvCA', 'youtube', 'es', false),
  ('earcos', 'https://www.youtube.com/@earcos', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCzarj-aG543UGayHbQ3L7OA', 'youtube', 'es', false),
  ('autofacil', 'https://www.youtube.com/@autofacil', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC4OaeLM5SSM66ThI_73NncQ', 'youtube', 'es', false),
  -- General automotive channels (require EV keyword filtering)
  ('cochesnet-yt', 'https://www.youtube.com/@cochesnet', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCAMKTtcWpjjeKJnmWytLfZQ', 'youtube', 'es', false),
  ('motorpuntoes', 'https://www.youtube.com/@motorpuntoes', 'https://www.youtube.com/feeds/videos.xml?channel_id=UCu6xusAl5kDmJXc9Sbr928Q', 'youtube', 'es', false)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON COLUMN articles.content_type IS 'Content type: news (articles), video (YouTube), blog (future own content)';
COMMENT ON COLUMN articles.youtube_video_id IS 'YouTube video ID for embed player (null for non-video content)';
COMMENT ON COLUMN articles.duration IS 'Video duration in ISO 8601 or human-readable format (null for non-video content)';
