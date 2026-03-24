-- Migration 22: Delete all scraped videos for clean re-scrape
-- First batch had shorts and misaligned youtube_video_ids due to parser bugs (now fixed)
DELETE FROM articles WHERE content_type = 'video';
