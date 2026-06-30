/**
 * Edge Function: Article Scraper
 *
 * Orchestrates the scraping, categorization, and storage of articles
 * from active RSS feeds. Runs on a cron schedule (4x daily).
 *
 * Flow:
 * 1. Authenticate request with SCRAPE_SECRET
 * 2. Fetch active sources from database
 * 3. For each source:
 *    - Parse feed (RSS or HTML)
 *    - Filter for EV content (motor.es only)
 *    - Auto-categorize by keywords
 *    - Cache OG images to Supabase Storage
 *    - Insert into database (skip duplicates)
 * 4. Return scraping results
 *
 * Note: Translation feature temporarily disabled (removed OpenAI dependency)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { parseRSS } from './parsers/rss-parser.ts';
import { parseYouTube } from './parsers/youtube-parser.ts';
import { isEVRelated } from './parsers/motor-filter.ts';
import { isYouTubeEVRelated } from './parsers/youtube-ev-filter.ts';
import { isNotHEV } from './parsers/hev-filter.ts';
import { isNotEBike } from './parsers/ebike-filter.ts';
import { categorize } from './services/categorizer.ts';
// import { translateToSpanish } from './services/translator.ts'; // Disabled: translation feature removed
import { cacheImage } from './services/image-cache.ts';
import { generateSummary } from './services/ai-summary.ts';
import type { Source, RawArticle, ScraperResult } from './types.ts';
import { YOUTUBE_EV_FILTERED_SOURCES } from './types.ts';

/**
 * Generate a URL-safe slug from a title string.
 *
 * STRUCTURAL DUPLICATE of src/lib/slugify.ts (the canonical implementation).
 * This Edge Function runs on Deno and cannot import from src/ (runtime
 * boundary), so the copy is intentional. Keep both in parity — if you change
 * one, change the other. The canonical source is src/lib/slugify.ts.
 */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

serve(async (req) => {
  try {
    // Authentication check (JWT verification disabled in config.toml)
    const authHeader = req.headers.get('Authorization');
    const scrapeSecret = Deno.env.get('SCRAPE_SECRET');

    if (!scrapeSecret || authHeader !== `Bearer ${scrapeSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // const openaiKey = Deno.env.get('OPENAI_API_KEY'); // Disabled: translation feature removed

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active sources from database
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('sources')
      .select('*')
      .eq('active', true);

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
    }

    console.log(`Processing ${sources?.length || 0} active sources...`);

    const results: ScraperResult[] = [];

    // Process each source
    for (const source of (sources as Source[]) || []) {
      console.log(`Processing source: ${source.name}`);

      try {
        let articles: RawArticle[] = [];
        const isYouTubeSource = source.feed_type === 'youtube';

        // Parse based on feed type
        // motor.es: fetch more items since most will be filtered out (general automotive site)
        // YouTube EV-filtered channels: fetch more for the same reason
        const isEVFiltered = YOUTUBE_EV_FILTERED_SOURCES.includes(source.name);
        const fetchLimit = (source.name === 'motor.es' || isEVFiltered) ? 30 : 5;

        if (isYouTubeSource) {
          articles = await parseYouTube(source.feed_url, fetchLimit);
        } else if (source.feed_type === 'rss') {
          articles = await parseRSS(source.feed_url, fetchLimit);
        }
        // TODO: Implement HTML parser for hibridosyelectricos.com

        console.log(`Fetched ${articles.length} ${isYouTubeSource ? 'videos' : 'articles'} from ${source.name}`);

        // Filter for motor.es (only EV-related content based on RSS categories)
        if (source.name === 'motor.es') {
          const originalCount = articles.length;
          articles = articles.filter(a => isEVRelated(a.categories));
          articles = articles.slice(0, 5);
          console.log(`Filtered motor.es: ${originalCount} -> ${articles.length} (EV only)`);
        }

        // Filter YouTube EV-filtered channels (cochesnet, motorpuntoes)
        if (isEVFiltered) {
          const originalCount = articles.length;
          articles = articles.filter(a => isYouTubeEVRelated(a.title, a.excerpt));
          articles = articles.slice(0, 5);
          console.log(`EV filter ${source.name}: ${originalCount} -> ${articles.length} (EV only)`);
        }

        // Filter out conventional hybrids (HEV) from all sources
        {
          const beforeHEV = articles.length;
          articles = articles.filter(a => isNotHEV(a.title, a.excerpt));
          if (beforeHEV > articles.length) {
            console.log(`HEV filter ${source.name}: ${beforeHEV} -> ${articles.length} (removed ${beforeHEV - articles.length} HEV)`);
          }
        }

        // Filter out e-bikes / electric bicycles / mopeds from all sources
        {
          const beforeEBike = articles.length;
          articles = articles.filter(a => isNotEBike(a.title, a.excerpt));
          if (beforeEBike > articles.length) {
            console.log(`E-bike filter ${source.name}: ${beforeEBike} -> ${articles.length} (removed ${beforeEBike - articles.length} e-bike)`);
          }
        }

        let processedCount = 0;
        let skippedCount = 0;

        // Batch duplicate check: fetch all existing article_urls for this batch
        // in a single query instead of one .single() per article (N+1 → 1).
        // Guard: skip the query when there are no articles to check (empty batch
        // after filtering).
        const existingUrls = new Set<string>();
        let batchQueryOk = false;
        if (articles.length > 0) {
          const urls = articles.map(a => a.article_url);
          const { data: existingRows, error: dupError } = await supabaseClient
            .from('articles')
            .select('article_url')
            .in('article_url', urls);

          if (dupError) {
            console.error(`Duplicate check query failed for ${source.name}:`, dupError.message);
            // Fall back to per-article checks so a batch query failure doesn't
            // skip the entire source — same behaviour as before the batch.
          } else {
            batchQueryOk = true;
            for (const row of (existingRows ?? [])) {
              existingUrls.add((row as { article_url: string }).article_url);
            }
          }
        }

        // Process each article
        for (let i = 0; i < articles.length; i++) {
          const article = articles[i];
          try {
            // Check for duplicates against the batch-fetched set (in-memory).
            // Falls back to a per-article query if the batch query failed above.
            if (batchQueryOk) {
              if (existingUrls.has(article.article_url)) {
                skippedCount++;
                continue;
              }
            } else {
              // Batch query failed (or wasn't run) — per-article fallback.
              const { data: existing } = await supabaseClient
                .from('articles')
                .select('id')
                .eq('article_url', article.article_url)
                .single();
              if (existing) {
                skippedCount++;
                continue;
              }
            }

            let title = article.title;
            let excerpt = article.excerpt;

            // Cache image to Cloudinary (YouTube thumbnails included)
            let imageUrl = article.image_url;
            if (imageUrl) {
              const articleId = crypto.randomUUID();
              imageUrl = await cacheImage(imageUrl, articleId);
            }

            // Generate AI summary + transparency warnings. For non-Spanish
            // sources, Gemini also returns Spanish translations of title and
            // excerpt so the article can be stored fully in Spanish.
            const {
              summary: aiSummary,
              warnings: aiWarnings,
              discussionPrompt: aiDiscussionPrompt,
              seoTitle,
              headlineTone,
              translatedTitle,
              translatedExcerpt,
            } = await generateSummary(
              title,
              excerpt,
              article.article_url,
              source.lang,
            );

            // Replace original title/excerpt with the Spanish translation when
            // available. If Gemini failed to translate, we fall back to the
            // original (coherent: original language remains throughout).
            if (translatedTitle) title = translatedTitle;
            if (translatedExcerpt) excerpt = translatedExcerpt;

            // Categorize and slugify with the final (translated when applicable)
            // values so the slug, category, and DB row are consistent.
            const category = categorize(title, excerpt);

            const youtubeVideoId = article.youtube_video_id || null;

            // Generate unique slug from (final) title
            let baseSlug = slugify(title);
            let slug = baseSlug;
            let suffix = 2;
            while (true) {
              const { data: slugExists } = await supabaseClient
                .from('articles')
                .select('id')
                .eq('slug', slug)
                .single();
              if (!slugExists) break;
              slug = `${baseSlug}-${suffix}`;
              suffix++;
            }

            // Insert into database
            const insertData: Record<string, unknown> = {
              source_id: source.id,
              title,
              slug,
              excerpt,
              image_url: imageUrl,
              article_url: article.article_url,
              category,
              published_at: article.published_at.toISOString(),
              content_type: isYouTubeSource ? 'video' : 'news',
              ai_summary: aiSummary,
              ai_warnings: aiWarnings.length > 0 ? aiWarnings : null,
              ai_discussion_prompt: aiDiscussionPrompt ?? null,
              ai_generated_at: aiSummary ? new Date().toISOString() : null,
              seo_title: seoTitle ?? null,
              headline_tone: headlineTone ?? null,
            };

            if (youtubeVideoId) {
              insertData.youtube_video_id = youtubeVideoId;
            }

            if (article.duration) {
              insertData.duration = article.duration;
            }

            const { error: insertError } = await supabaseClient
              .from('articles')
              .insert(insertData);

            if (insertError) {
              console.error(`Insert error for ${article.article_url}:`, insertError);
            } else {
              // Mirror the insert into the in-memory set so a duplicate
              // article_url later in the same batch skips cleanly (without
              // this, an intra-lote dup would pass the check and waste a
              // Gemini call + Cloudinary upload before hitting the UNIQUE
              // constraint).
              existingUrls.add(article.article_url);
              processedCount++;
            }
          } catch (articleError) {
            console.error(`Article processing error:`, articleError);
          }
        }

        results.push({
          source: source.name,
          count: processedCount
        });

        console.log(`${source.name}: ${processedCount} new, ${skippedCount} skipped`);
      } catch (sourceError) {
        console.error(`Source error for ${source.name}:`, sourceError);
        results.push({
          source: source.name,
          error: sourceError instanceof Error ? sourceError.message : 'Unknown error'
        });
      }
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
