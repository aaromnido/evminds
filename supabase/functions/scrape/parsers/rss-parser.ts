/**
 * Parser: Generic RSS feed parser
 * Extracts articles from RSS feeds (electrek.co, cnevpost.com, motor.es, forococheselectricos.com)
 */

import type { RawArticle } from '../types.ts';

/**
 * Parses an RSS feed and extracts article data
 * @param feedUrl - URL of the RSS feed
 * @returns Array of raw articles
 */
export async function parseRSS(feedUrl: string): Promise<RawArticle[]> {
  try {
    const response = await fetch(feedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xml = await response.text();

    // Parse XML using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed');
    }

    const items = doc.querySelectorAll('item');
    const articles: RawArticle[] = [];

    for (const item of items) {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';

      // Skip if essential fields are missing
      if (!title || !link) {
        continue;
      }

      // Extract image from content:encoded (WordPress feeds)
      const contentEncoded = item.querySelector('encoded')?.textContent || '';
      const imageMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/);
      let image = imageMatch?.[1] || null;

      // Fallback: try media:content or media:thumbnail
      if (!image) {
        const mediaThumbnail = item.querySelector('thumbnail');
        const mediaContent = item.querySelector('content');
        image = mediaThumbnail?.getAttribute('url') ||
                mediaContent?.getAttribute('url') ||
                null;
      }

      // Clean description (remove HTML tags)
      const cleanExcerpt = description
        .replace(/<[^>]*>/g, '')
        .replace(/\n/g, ' ')
        .trim()
        .substring(0, 300);

      articles.push({
        title: title.trim(),
        article_url: link.trim(),
        excerpt: cleanExcerpt,
        image_url: image,
        published_at: pubDate ? new Date(pubDate) : new Date()
      });
    }

    return articles;
  } catch (error) {
    console.error(`RSS parsing error for ${feedUrl}:`, error);
    return []; // Return empty array on error
  }
}
