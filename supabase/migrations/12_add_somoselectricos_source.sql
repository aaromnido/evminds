-- Migration 12: Add somoselectricos.com as a new RSS source
-- Spanish EV-dedicated site, no content filtering needed

INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  (
    'somoselectricos.com',
    'https://somoselectricos.com',
    'https://somoselectricos.com/feed/',
    'rss',
    'es',
    true
  )
ON CONFLICT DO NOTHING;
