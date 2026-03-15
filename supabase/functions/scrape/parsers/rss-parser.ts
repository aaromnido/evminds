/**
 * Parser: Generic RSS feed parser
 * Extracts articles from RSS feeds (electrek.co, cnevpost.com, motor.es, forococheselectricos.com)
 * Uses regex-based parsing compatible with Deno Edge Runtime
 */

import type { RawArticle } from '../types.ts';

/**
 * Extracts text content between XML tags
 */
function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]+)\\]\\]><\/${tag}>|<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : null;
}

/**
 * Parses an RSS feed and extracts article data
 * @param feedUrl - URL of the RSS feed
 * @param limit - Maximum number of articles to extract (default: 5)
 * @returns Array of raw articles
 */
export async function parseRSS(feedUrl: string, limit: number = 5): Promise<RawArticle[]> {
  try {
    const response = await fetch(feedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }

    const xml = await response.text();

    // Extract all <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = xml.match(itemRegex) || [];
    const articles: RawArticle[] = [];
    let count = 0;

    for (const itemXml of items) {
      // Stop if we've reached the limit
      if (count >= limit) {
        break;
      }

      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const description = extractTag(itemXml, 'description');
      const pubDate = extractTag(itemXml, 'pubDate');

      // Skip if essential fields are missing
      if (!title || !link) {
        continue;
      }

      // Extract image from content:encoded (WordPress feeds)
      const contentEncoded = extractTag(itemXml, 'content:encoded') || '';
      const imageMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/);
      let image = imageMatch?.[1] || null;

      // Fallback: try media:content or media:thumbnail attributes
      if (!image) {
        const mediaThumbnailMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
        const mediaContentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        image = mediaThumbnailMatch?.[1] || mediaContentMatch?.[1] || null;
      }

      // Clean description (remove HTML tags and CDATA)
      const cleanExcerpt = (description || '')
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
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

      count++;
    }

    return articles;
  } catch (error) {
    console.error(`RSS parsing error for ${feedUrl}:`, error);
    return []; // Return empty array on error
  }
}
