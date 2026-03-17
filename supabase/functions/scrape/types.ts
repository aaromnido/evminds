/**
 * Type definitions for the scraper Edge Function
 */

export interface Source {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  feed_type: 'rss' | 'html';
  lang: 'es' | 'en';
  active: boolean;
}

export interface RawArticle {
  title: string;
  excerpt: string;
  article_url: string;
  image_url: string | null;
  published_at: Date;
  categories: string[];
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
