-- Migration 3: Seed initial sources
-- Insert the 5 news sources we'll scrape from

INSERT INTO sources (name, url, feed_url, feed_type, lang, active) VALUES
  (
    'forococheselectricos.com',
    'https://forococheselectricos.com',
    'https://forococheselectricos.com/feed/',
    'rss',
    'es',
    true
  ),
  (
    'motor.es',
    'https://www.motor.es',
    'https://www.motor.es/feed/',
    'rss',
    'es',
    true
  ),
  (
    'hibridosyelectricos.com',
    'https://www.hibridosyelectricos.com',
    'https://www.hibridosyelectricos.com',
    'html',
    'es',
    true
  ),
  (
    'cnevpost.com',
    'https://cnevpost.com',
    'https://cnevpost.com/feed/',
    'rss',
    'en',
    true
  ),
  (
    'electrek.co',
    'https://electrek.co',
    'https://electrek.co/feed/',
    'rss',
    'en',
    true
  )
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_sources FROM sources WHERE active = true;
