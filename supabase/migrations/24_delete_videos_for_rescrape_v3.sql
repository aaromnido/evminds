-- Migration 24: Delete all videos for clean re-scrape with 5min minimum duration
DELETE FROM articles WHERE content_type = 'video';
