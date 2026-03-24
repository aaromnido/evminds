/**
 * Type definitions for the scraper Edge Function
 */

export interface Source {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  feed_type: 'rss' | 'html' | 'youtube';
  lang: 'es' | 'en';
  active: boolean;
}

/** YouTube channels that require EV keyword filtering (general automotive channels) */
export const YOUTUBE_EV_FILTERED_SOURCES = ['cochesnet-yt', 'motorpuntoes'];

export interface RawArticle {
  title: string;
  excerpt: string;
  article_url: string;
  image_url: string | null;
  published_at: Date;
  categories: string[];
  youtube_video_id?: string;
  duration?: string;
}

export interface ArticleData extends RawArticle {
  source_id: string;
  category: string;
}

export interface ScraperResult {
  source: string;
  count?: number;
  error?: string;
}
