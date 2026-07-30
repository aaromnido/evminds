/**
 * Edge Function: EVminds' `posts` record — excerpt, category and tags,
 * derived from the title + body the redactor already wrote.
 *
 * Kept as its own call rather than folded into the EVminds redactor schema
 * (Fer's call, 2026-07-27): each mock gets its own isolated Edge Function.
 *
 * `VALID_POST_CATEGORIES` is duplicated from `src/lib/post-categories.ts`
 * rather than imported — same Deno-boundary duplication already documented
 * for `WarningType`/`HeadlineTone` in `ai-summary.ts`. Keep in sync by hand.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;

// Mirror of the canonical list in src/lib/post-categories.ts (the Edge
// Function can't import the frontend tree). Keep both in sync.
const VALID_POST_CATEGORIES = ['Experiencia', 'Guía', 'Review', 'Opinión', 'Viaje'] as const;
type PostCategory = (typeof VALID_POST_CATEGORIES)[number];

const EXCERPT_MIN = 80;
const EXCERPT_MAX = 160;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface Result {
  excerpt: string;
  category: PostCategory;
  tags: string[];
}

function buildPrompt(title: string, body: string): string {
  return `Eres el editor que rellena la ficha de un artículo de EVminds ya escrito, a partir de su título y su cuerpo.

Título: ${title}

Cuerpo:
${body}

Rellena tres campos:
- "excerpt": el extracto que se lee en las tarjetas del sitio y en Google. Entre ${EXCERPT_MIN} y ${EXCERPT_MAX} caracteres. Cuenta de qué va la pieza y por qué merece el clic, sin repetir el titular palabra por palabra.
- "category": elige EXACTAMENTE una de estas cinco, la que mejor encaje:
  - "Experiencia": relato en primera persona de usar el coche o la infraestructura en el día a día.
  - "Guía": contenido práctico, paso a paso, para resolver una duda concreta.
  - "Review": prueba o valoración de un coche o producto concreto.
  - "Opinión": postura personal sobre un tema del sector.
  - "Viaje": relato de una ruta o trayecto largo.
- "tags": entre 2 y 5 etiquetas cortas en español, en minúscula, relevantes para el contenido.

No inventes datos que no estén en el texto.`;
}

async function generate(title: string, body: string): Promise<Result | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot build post record');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(title, body) }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          excerpt: { type: 'STRING' },
          category: { type: 'STRING', enum: [...VALID_POST_CATEGORIES] },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['excerpt', 'category', 'tags'],
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
    const excerpt = typeof parsed.excerpt === 'string' ? parsed.excerpt.trim() : '';
    const category = VALID_POST_CATEGORIES.find((c) => c === parsed.category);
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    if (!excerpt || !category) return null;

    return { excerpt, category, tags: tags.slice(0, 5) };
  } catch (error) {
    console.error('editorial-post-record error:', error);
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
    const text = typeof (body as Record<string, unknown>).body === 'string'
      ? ((body as Record<string, unknown>).body as string).trim()
      : '';
    if (!title || !text) return json({ error: 'Falta el título o el cuerpo.' }, 400);

    const result = await generate(title, text);
    if (!result) return json({ error: 'AI generation failed' }, 502);

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('editorial-post-record error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
