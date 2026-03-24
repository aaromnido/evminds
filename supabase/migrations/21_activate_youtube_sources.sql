-- Migration 21: Activate YouTube sources for scraping
UPDATE sources SET active = true WHERE feed_type = 'youtube';
