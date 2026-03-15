/**
 * Parser: Generic RSS feed parser
 * Extracts articles from RSS feeds (electrek.co, cnevpost.com, motor.es, forococheselectricos.com)
 * Uses regex-based parsing compatible with Deno Edge Runtime
 */

import type { RawArticle } from '../types.ts';

/**
 * Decodes HTML entities (&#039;, &quot;, &amp;, etc.)
 */
function decodeHTMLEntities(text: string): string {
  return text
    // Decode numeric entities (decimal: &#39;)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Decode hex entities (&#x27;)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decode named entities
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // Must be last to avoid double-decoding
}

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

      // Extract image from multiple sources (try in order of priority)
      let image: string | null = null;

      // 1. Try content:encoded (WordPress full content)
      const contentEncoded = extractTag(itemXml, 'content:encoded') || '';
      const contentImageMatch = contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/);
      image = contentImageMatch?.[1] || null;

      // 2. Fallback to description (Electrek, many WordPress sites)
      if (!image && description) {
        const descImageMatch = description.match(/<img[^>]+src=["']([^"']+)["']/);
        image = descImageMatch?.[1] || null;
      }

      // 3. Fallback to media:thumbnail or media:content
      if (!image) {
        const mediaThumbnailMatch = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
        const mediaContentMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        image = mediaThumbnailMatch?.[1] || mediaContentMatch?.[1] || null;
      }

      // Clean description (remove HTML tags and CDATA)
      const cleanExcerpt = decodeHTMLEntities(
        (description || '')
          .replace(/<!\[CDATA\[/g, '')
          .replace(/\]\]>/g, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\n/g, ' ')
          .trim()
          .substring(0, 300)
      );

      articles.push({
        title: decodeHTMLEntities(title.trim()),
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
