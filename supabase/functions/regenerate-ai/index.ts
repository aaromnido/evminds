/**
 * Edge Function: Regenerate AI fields for a single article.
 *
 * Admin-triggered backfill/redo of the Gemini fields the scraper normally fills
 * at insert time (ai_summary, ai_warnings, ai_discussion_prompt, ai_generated_at).
 * For non-Spanish sources Gemini also returns Spanish translations of the title
 * and excerpt, which replace the stored values (mirrors the scraper).
 *
 * Reuses generateSummary() from the scraper services so behaviour stays identical
 * and the Gemini key never leaves Supabase. Same auth as scrape: Bearer
 * SCRAPE_SECRET + verify_jwt=false. The admin never calls this directly — a
 * gated /admin proxy holds the secret.
 *
 * Body: { id: string } — the article id.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { generateSummary } from '../scrape/services/ai-summary.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  try {
    // Auth (JWT verification disabled in config.toml).
    const authHeader = req.headers.get('Authorization');
    const secret = Deno.env.get('SCRAPE_SECRET');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { id } = await req.json().catch(() => ({ id: undefined }));
    if (!id || typeof id !== 'string') {
      return json({ error: 'Missing article id' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase credentials');
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the article + its source language (drives summary language + translation).
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, excerpt, article_url, source:sources!inner(lang)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return json({ error: 'Article not found' }, 404);
    }

    // Embedded to-one resource may come back as object or single-element array.
    const src = Array.isArray(data.source) ? data.source[0] : data.source;
    const lang: string = src?.lang ?? 'es';

    const result = await generateSummary(
      data.title,
      data.excerpt,
      data.article_url,
      lang,
    );

    if (!result.summary) {
      return json(
        { error: 'AI generation failed (no summary returned)' },
        502,
      );
    }

    const update: Record<string, unknown> = {
      ai_summary: result.summary,
      ai_warnings: result.warnings.length > 0 ? result.warnings : null,
      ai_discussion_prompt: result.discussionPrompt ?? null,
      ai_generated_at: new Date().toISOString(),
    };
    // Replace title/excerpt with the Spanish translation when the source isn't 'es'.
    if (result.translatedTitle) update.title = result.translatedTitle;
    if (result.translatedExcerpt) update.excerpt = result.translatedExcerpt;

    const { error: updErr } = await supabase
      .from('articles')
      .update(update)
      .eq('id', id);

    if (updErr) {
      return json({ error: `Update failed: ${updErr.message}` }, 500);
    }

    return json({
      ok: true,
      summary: result.summary,
      warnings: result.warnings.map((w) => w.type),
      translated: Boolean(result.translatedTitle || result.translatedExcerpt),
    });
  } catch (err) {
    console.error('regenerate-ai error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
