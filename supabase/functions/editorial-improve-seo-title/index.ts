/**
 * Edge Function: "Mejorar SEO" on a headline — used both on step ②'s shared
 * brief title (60 chars, `DefineAngleStep`) and on Motor.es' `Título`
 * (65 chars, `PublishChannelStep`). One function, `maxLength` as an input,
 * rather than two near-identical functions.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { STYLE_GUIDE } from '../editorial-redactor/prompt-context.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;
const DEFAULT_MAX_LENGTH = 60;
const MIN_MAX_LENGTH = 20;
const MAX_MAX_LENGTH = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPrompt(title: string, maxLength: number): string {
  return `Eres el editor que ayuda a Fernando Val a mejorar un titular para búsquedas, escribiendo bajo su guía de estilo que sigue a continuación.

${STYLE_GUIDE}

Titular actual: ${title}

Reescríbelo para que la parte por la que alguien buscaría vaya primero y quepa en un resultado de búsqueda. Sigue la regla de la guía de estilo de arriba: descriptivo, con la palabra clave dentro, nunca clickbait, y que prometa exactamente lo que el artículo entrega. Apunta a ${maxLength} caracteres como máximo, sin pasarte.

Devuelve un JSON con un único campo "title": el titular mejorado.`;
}

async function generate(title: string, maxLength: number): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot improve title');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(title, maxLength) }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 256,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' } },
        required: ['title'],
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
    const result = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    return result || null;
  } catch (error) {
    console.error('editorial-improve-seo-title error:', error);
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

    const rawMaxLength = (body as Record<string, unknown>).maxLength;
    const maxLength =
      typeof rawMaxLength === 'number' && rawMaxLength >= MIN_MAX_LENGTH && rawMaxLength <= MAX_MAX_LENGTH
        ? rawMaxLength
        : DEFAULT_MAX_LENGTH;

    const result = await generate(title, maxLength);
    if (!result) return json({ error: 'AI generation failed' }, 502);

    return json({ ok: true, title: result });
  } catch (err) {
    console.error('editorial-improve-seo-title error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
