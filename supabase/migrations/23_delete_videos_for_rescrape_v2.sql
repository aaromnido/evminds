-- Migration 23: Delete all videos for clean re-scrape with duration filter
-- Previous batch included shorts (no duration filtering). Now fixed with YouTube Data API.
DELETE FROM articles WHERE content_type = 'video';
