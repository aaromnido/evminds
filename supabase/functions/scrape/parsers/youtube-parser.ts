/**
 * Parser: YouTube Atom feed parser
 * Extracts videos from YouTube channel feeds (Atom format).
 * Filters out Shorts and short videos (< 3 min) using YouTube Data API.
 */

import type { RawArticle } from '../types.ts';
import { decodeHTMLEntities, extractTag } from './xml-utils.ts';

/** Maximum characters for video description excerpt */
const EXCERPT_MAX_LENGTH = 300;

/** Minimum video duration in seconds to include (filters out Shorts and clips) */
const MIN_DURATION_SECONDS = 300;

/** Maximum video IDs per YouTube Data API batch request */
const YOUTUBE_API_BATCH_SIZE = 50;

/**
 * Cleans YouTube video description for use as excerpt.
 * Removes promotional links, timestamps, hashtags, and excessive whitespace.
 * Keeps only the first meaningful paragraph.
 */
function cleanDescription(description: string): string {
  if (!description) return '';

  const lines = description.split('\n');
  const cleanLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at lines that are clearly promotional / boilerplate
    if (trimmed.match(/^https?:\/\//i)) continue;
    if (trimmed.match(/patreon|patreon\.com|ivoox|referid|bit\.ly|amzn\.to|descuento|apóyanos|apoyarnos|suscríbete/i)) continue;
    if (trimmed.match(/^#\S/)) continue; // Hashtag lines
    if (trimmed === '') {
      if (cleanLines.length > 0) break;
      continue;
    }

    cleanLines.push(trimmed);
  }

  const text = cleanLines.join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= EXCERPT_MAX_LENGTH) return text;

  const truncated = text.substring(0, EXCERPT_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…';
}

/**
 * Returns the highest quality thumbnail URL for a YouTube video.
 */
function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Parses an ISO 8601 duration string (e.g., "PT3M45S", "PT1H2M10S") into seconds.
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats duration in seconds to human-readable string (e.g., "12:34", "1:02:15").
 */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/**
 * Fetches video durations and live status from YouTube Data API.
 * Returns a Map of videoId → { durationSeconds, isLive, formattedDuration }.
 * Videos not found or with errors are excluded from the map.
 */
async function fetchVideoDurations(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, { durationSeconds: number; isLive: boolean; formattedDuration: string }>> {
  const result = new Map<string, { durationSeconds: number; isLive: boolean; formattedDuration: string }>();

  // Batch in groups of YOUTUBE_API_BATCH_SIZE
  for (let i = 0; i < videoIds.length; i += YOUTUBE_API_BATCH_SIZE) {
    const batch = videoIds.slice(i, i + YOUTUBE_API_BATCH_SIZE);
    const idsParam = batch.join(',');

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,liveStreamingDetails&id=${idsParam}&key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`YouTube Data API error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      for (const item of data.items || []) {
        const durationStr = item.contentDetails?.duration || 'PT0S';
        const durationSeconds = parseDuration(durationStr);
        // A video is currently live if it has liveStreamingDetails but no actualEndTime
        const liveDetails = item.liveStreamingDetails;
        const isLive = !!(liveDetails && !liveDetails.actualEndTime);

        result.set(item.id, {
          durationSeconds,
          isLive,
          formattedDuration: formatDuration(durationSeconds),
        });
      }
    } catch (error) {
      console.error(`YouTube Data API fetch error for batch starting at ${i}:`, error);
    }
  }

  return result;
}

/**
 * Parses a YouTube Atom feed and extracts video data.
 * Uses YouTube Data API to filter out Shorts (< 3 min) and active livestreams.
 *
 * @param feedUrl - YouTube Atom feed URL
 * @param limit - Maximum number of videos to extract (default: 5)
 * @returns Array of raw articles (videos mapped to article structure)
 */
export async function parseYouTube(feedUrl: string, limit: number = 5): Promise<RawArticle[]> {
  try {
    const response = await fetch(feedUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube feed: ${response.status}`);
    }

    const xml = await response.text();

    // Extract all <entry> blocks (YouTube uses Atom, not RSS)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    const entries = xml.match(entryRegex) || [];
    const candidates: RawArticle[] = [];

    // Parse all entries from feed (more than limit, since some will be filtered)
    for (const entryXml of entries) {
      const videoId = extractTag(entryXml, 'yt:videoId');
      const title = extractTag(entryXml, 'title');
      const published = extractTag(entryXml, 'published');
      const description = extractTag(entryXml, 'media:description') || '';

      if (!videoId || !title) continue;

      const decodedTitle = decodeHTMLEntities(title.trim());
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const excerpt = cleanDescription(decodeHTMLEntities(description));
      const imageUrl = getThumbnailUrl(videoId);

      candidates.push({
        title: decodedTitle,
        article_url: videoUrl,
        excerpt,
        image_url: imageUrl,
        published_at: published ? new Date(published) : new Date(),
        categories: [],
        youtube_video_id: videoId,
      });
    }

    if (candidates.length === 0) return [];

    // Fetch durations from YouTube Data API to filter shorts and active lives
    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.warn('YOUTUBE_API_KEY not set — skipping duration filter, returning all candidates');
      return candidates.slice(0, limit);
    }

    const videoIds = candidates.map(c => c.youtube_video_id!);
    const durations = await fetchVideoDurations(videoIds, apiKey);

    const filtered: RawArticle[] = [];
    for (const candidate of candidates) {
      if (filtered.length >= limit) break;

      const info = durations.get(candidate.youtube_video_id!);
      if (!info) continue; // Video not found in API response — skip

      // Filter: active livestreams
      if (info.isLive) {
        console.log(`Skipping live: ${candidate.title}`);
        continue;
      }

      // Filter: short videos (Shorts, clips, etc.)
      if (info.durationSeconds < MIN_DURATION_SECONDS) {
        console.log(`Skipping short (${info.formattedDuration}): ${candidate.title}`);
        continue;
      }

      // Store human-readable duration
      candidate.duration = info.formattedDuration;

      filtered.push(candidate);
    }

    return filtered;
  } catch (error) {
    console.error(`YouTube feed parsing error for ${feedUrl}:`, error);
    return [];
  }
}
