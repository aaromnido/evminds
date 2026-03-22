-- Migration 13: Delete somoselectricos articles so the scraper re-fetches them
-- with the fixed CDATA parser that now extracts image URLs correctly.

DELETE FROM articles
WHERE source_id = (SELECT id FROM sources WHERE name = 'somoselectricos.com');
