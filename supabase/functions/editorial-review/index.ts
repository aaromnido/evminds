/**
 * Edge Function: the A3 reviewer. An already-generated draft in, a
 * structured checklist of findings out — never rewrites anything itself.
 *
 * Same auth as the rest of this family: Bearer SCRAPE_SECRET + verify_jwt=false
 * (config.toml). The admin never calls this directly — the gated /admin proxy
 * (`src/pages/admin/redaccion/review-draft.ts`) holds the secret.
 *
 * Body: see `ReviewInput` in `review.ts`.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { reviewDraft, type Channel, type ReviewInput } from './review.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    const secret = Deno.env.get('SCRAPE_SECRET');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid request body' }, 400);
    }

    const rawBody = body as Record<string, unknown>;
    const channel = rawBody.channel;
    if (channel !== 'motor' && channel !== 'evminds') {
      return json({ error: 'channel must be "motor" or "evminds"' }, 400);
    }

    const briefTitle = typeof rawBody.briefTitle === 'string' ? rawBody.briefTitle.trim() : '';
    const briefAngle = typeof rawBody.briefAngle === 'string' ? rawBody.briefAngle.trim() : '';
    const title = typeof rawBody.title === 'string' ? rawBody.title.trim() : '';
    const articleBody = typeof rawBody.body === 'string' ? rawBody.body.trim() : '';
    if (!briefTitle || !briefAngle || !title || !articleBody) {
      return json({ error: 'Missing briefTitle, briefAngle, title or body' }, 400);
    }

    const input: ReviewInput = {
      channel: channel as Channel,
      briefTitle,
      briefAngle,
      title,
      body: articleBody,
    };

    const result = await reviewDraft(input);
    if (!result) {
      return json({ error: 'AI review failed' }, 502);
    }

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('editorial-review error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
