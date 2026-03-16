-- Migration 7: Add InsideEVs source
-- Add InsideEVs (insideevs.com) as a new active English news source

INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  (
    'insideevs.com',
    'https://insideevs.com',
    'https://insideevs.com/rss/articles/all/',
    'rss',
    'en',
    true
  )
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT name, feed_url, active FROM sources WHERE name = 'insideevs.com';
