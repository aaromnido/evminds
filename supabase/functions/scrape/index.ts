/**
 * Edge Function: Article Scraper
 *
 * Orchestrates the scraping, translation, categorization, and storage of articles
 * from active RSS feeds. Runs on a cron schedule (4x daily).
 *
 * Flow:
 * 1. Authenticate request with SCRAPE_SECRET
 * 2. Fetch active sources from database
 * 3. For each source:
 *    - Parse feed (RSS or HTML)
 *    - Filter for EV content (motor.es only)
 *    - Translate if English (OpenAI GPT-4o mini)
 *    - Auto-categorize by keywords
 *    - Cache OG images to Supabase Storage
 *    - Insert into database (skip duplicates)
 * 4. Return scraping results
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseRSS } from './parsers/rss-parser.ts';
import { isEVRelated } from './parsers/motor-filter.ts';
import { categorize } from './services/categorizer.ts';
import { translateToSpanish } from './services/translator.ts';
import { cacheImage } from './services/image-cache.ts';
import type { Source, RawArticle, ScraperResult } from './types.ts';

serve(async (req) => {
  try {
    // Authentication check
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

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

        // Parse based on feed type
        if (source.feed_type === 'rss') {
          articles = await parseRSS(source.feed_url);
        }
        // TODO: Implement HTML parser for hibridosyelectricos.com

        console.log(`Fetched ${articles.length} articles from ${source.name}`);

        // Filter for motor.es (only EV-related content)
        if (source.name === 'motor.es') {
          const originalCount = articles.length;
          articles = articles.filter(a => isEVRelated(a.title, a.excerpt));
          console.log(`Filtered motor.es: ${originalCount} -> ${articles.length} (EV only)`);
        }

        let processedCount = 0;
        let skippedCount = 0;

        // Process each article
        for (const article of articles) {
          try {
            // Check for duplicates (unique constraint on article_url)
            const { data: existing } = await supabaseClient
              .from('articles')
              .select('id')
              .eq('article_url', article.article_url)
              .single();

            if (existing) {
              skippedCount++;
              continue; // Skip duplicate
            }

            // Translate if English source
            let title = article.title;
            let excerpt = article.excerpt;

            if (source.lang === 'en' && openaiKey) {
              console.log(`Translating: ${title.substring(0, 50)}...`);
              const translated = await translateToSpanish(title, excerpt, openaiKey);
              title = translated.title;
              excerpt = translated.excerpt;
            }

            // Categorize by keywords
            const category = categorize(title, excerpt);

            // Cache image to Supabase Storage
            let imageUrl = article.image_url;
            if (imageUrl) {
              const articleId = crypto.randomUUID();
              imageUrl = await cacheImage(imageUrl, articleId, supabaseClient);
            }

            // Insert into database
            const { error: insertError } = await supabaseClient
              .from('articles')
              .insert({
                source_id: source.id,
                title,
                excerpt,
                image_url: imageUrl,
                article_url: article.article_url,
                category,
                published_at: article.published_at.toISOString()
              });

            if (insertError) {
              console.error(`Insert error for ${article.article_url}:`, insertError);
            } else {
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
