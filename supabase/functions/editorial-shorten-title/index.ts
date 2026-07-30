/**
 * Edge Function: "Acortar el titular para el meta título" — Motor.es only,
 * offered only when the headline overruns their recommended 65 characters
 * (see `PublishChannelStep`, `CmsSearchFields`).
 *
 * An AI rewrite rather than a plain truncation on purpose: cutting at a word
 * boundary alone tends to leave a headline that reads broken, and this is a
 * field a reader actually sees in search results.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { MOTOR_STYLE_GUIDE } from '../editorial-redactor/prompt-context.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPrompt(title: string): string {
  return `Eres el editor que ayuda a Fernando Val a acortar un titular de Motor.es para el campo "Meta título", escribiendo bajo sus reglas de la casa que siguen a continuación.

${MOTOR_STYLE_GUIDE}

Titular original (se pasa de los 65 caracteres recomendados): ${title}

Reescríbelo más corto, apuntando a 65 caracteres como máximo, conservando el hecho principal y sin que quede una frase cortada o rara. No es un resumen distinto, es el mismo titular dicho más corto.

Devuelve un JSON con un único campo "metaTitle".`;
}

async function generate(title: string): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot shorten title');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(title) }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: { metaTitle: { type: 'STRING' } },
        required: ['metaTitle'],
      },
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  try {
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      if (response.ok) break;

      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      console.error(`Gemini API error (${response.status}): ${await response.text()}`);
      return null;
    }

    if (!response || !response.ok) return null;

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') return null;

    const parsed = JSON.parse(text);
    const result = typeof parsed.metaTitle === 'string' ? parsed.metaTitle.trim() : '';
    return result || null;
  } catch (error) {
    console.error('editorial-shorten-title error:', error);
    return null;
  }
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

    const title = typeof (body as Record<string, unknown>).title === 'string'
      ? ((body as Record<string, unknown>).title as string).trim()
      : '';
    if (!title) return json({ error: 'Falta el titular.' }, 400);

    const result = await generate(title);
    if (!result) return json({ error: 'AI generation failed' }, 502);

    return json({ ok: true, metaTitle: result });
  } catch (err) {
    console.error('editorial-shorten-title error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
