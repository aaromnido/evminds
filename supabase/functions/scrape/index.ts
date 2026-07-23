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
import { excludedPowertrainMatch } from './parsers/powertrain-filter.ts';
import { isNotEBike } from './parsers/ebike-filter.ts';
import { categorize } from './services/categorizer.ts';
// import { translateToSpanish } from './services/translator.ts'; // Disabled: translation feature removed
import { cacheImage } from './services/image-cache.ts';
import { generateSummary } from './services/ai-summary.ts';
import { purgeNetlifyTags } from './services/netlify-purge.ts';
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
          console.log(`Filtered motor.es: ${originalCount} -> ${articles.length} (EV only)`);
        }

        // Filter YouTube EV-filtered channels (cochesnet, motorpuntoes)
        if (isEVFiltered) {
          const originalCount = articles.length;
          articles = articles.filter(a => isYouTubeEVRelated(a.title, a.excerpt));
          console.log(`EV filter ${source.name}: ${originalCount} -> ${articles.length} (EV only)`);
        }

        // Filter out non-BEV powertrains from all sources, logging the term
        // that matched: keyword discards are never inserted, so this log is
        // their only trace.
        {
          const beforeFilter = articles.length;
          articles = articles.filter(a => {
            const matched = excludedPowertrainMatch(a.title, a.excerpt);
            if (matched) {
              console.log(`Powertrain filter ${source.name}: discarded "${a.title}" (matched "${matched}")`);
            }
            return matched === null;
          });
          if (beforeFilter > articles.length) {
            console.log(`Powertrain filter ${source.name}: ${beforeFilter} -> ${articles.length} (removed ${beforeFilter - articles.length} non-BEV)`);
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

        // Cap generalist sources AFTER the powertrain/e-bike filters so
        // excluded articles don't burn slots (these sources fetch 30 items
        // precisely so enough survive the filtering).
        if (source.name === 'motor.es' || isEVFiltered) {
          articles = articles.slice(0, 5);
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

            // Generate AI summary + transparency warnings FIRST (before
            // cacheImage) so the powertrain verdict arrives before we upload
            // anything to Cloudinary. For non-Spanish sources, Gemini also
            // returns Spanish translations of title and excerpt so the article
            // can be stored fully in Spanish.
            const {
              summary: aiSummary,
              warnings: aiWarnings,
              discussionPrompt: aiDiscussionPrompt,
              seoTitle,
              headlineTone,
              translatedTitle,
              translatedExcerpt,
              powertrain,
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

            // BEV-only filter (Fase 2): if Gemini classifies the powertrain
            // as non-BEV, insert the row with archived=true so the dedup
            // prevents re-evaluation on future runs. The row is visible in
            // the admin for monitoring. Cache is skipped for archived rows
            // (trade-off: image stays remote; acceptable at ~1-2/day).
            const AI_ARCHIVED_POWERTRAINS = new Set(['phev', 'erev', 'hev', 'ice']);
            const aiArchived = powertrain !== undefined && AI_ARCHIVED_POWERTRAINS.has(powertrain);

            if (aiArchived) {
              console.log(`AI filter: archived ${article.article_url} (${powertrain})`);
            }

            // Cache image to Cloudinary (YouTube thumbnails included).
            // Skip for AI-archived rows to avoid unnecessary uploads.
            let imageUrl = article.image_url;
            if (!aiArchived && imageUrl) {
              const articleId = crypto.randomUUID();
              imageUrl = await cacheImage(imageUrl, articleId);
            }

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
              archived: aiArchived,
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

    // Purge the edge cache so new/removed articles show up without waiting for
    // the listings TTL. Unconditional (even on a zero-new-articles run) — cheap
    // revalidation, and the alternative (conditioning on processedCount) risks
    // missing a purge if a later source in the loop did insert something.
    await purgeNetlifyTags(['listings', 'feeds'], {
      token: Deno.env.get('NETLIFY_PURGE_TOKEN'),
      siteId: Deno.env.get('NETLIFY_SITE_ID'),
    });

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
