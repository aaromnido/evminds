/**
 * Edge Function: the A3 redactor. One channel's brief in, one structured draft
 * out — Motor.es' twelve CMS fields, or EVminds' title + body.
 *
 * Same auth as regenerate-ai and scrape: Bearer SCRAPE_SECRET + verify_jwt=false
 * (config.toml). The admin never calls this directly — the gated /admin proxy
 * (`src/pages/admin/redaccion/generate-draft.ts`) holds the secret and, for
 * EVminds, resolves the sibling Motor.es draft before calling.
 *
 * Body: see `RedactorInput` in `redactor.ts`.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { generateDraft, type Channel, type RedactorInput } from './redactor.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

serve(async (req) => {
  try {
    // Auth (JWT verification disabled in config.toml).
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
    if (!briefTitle || !briefAngle) {
      return json({ error: 'Missing briefTitle or briefAngle' }, 400);
    }

    const rawMotorDraft =
      channel === 'evminds' && rawBody.motorDraft && typeof rawBody.motorDraft === 'object'
        ? (rawBody.motorDraft as Record<string, unknown>)
        : null;

    const input: RedactorInput = {
      channel: channel as Channel,
      briefTitle,
      briefAngle,
      referenceContent: typeof rawBody.referenceContent === 'string' ? rawBody.referenceContent : '',
      sourceName: optionalString(rawBody.sourceName),
      sourceUrl: optionalString(rawBody.sourceUrl),
      weeklyNotes: channel === 'evminds' ? optionalString(rawBody.weeklyNotes) : null,
      motorDraft: rawMotorDraft
        ? {
            title: typeof rawMotorDraft.title === 'string' ? rawMotorDraft.title : '',
            lead: typeof rawMotorDraft.lead === 'string' ? rawMotorDraft.lead : '',
            body: typeof rawMotorDraft.body === 'string' ? rawMotorDraft.body : '',
          }
        : null,
    };

    const result = await generateDraft(input);
    if (!result) {
      return json({ error: 'AI generation failed' }, 502);
    }

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('editorial-redactor error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
