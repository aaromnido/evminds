/**
 * Edge Function: the curator (step ①'s "Propuestas de hoy").
 *
 * Pure "structured articles in, structured proposals out" — no database access,
 * matching every other side-call's contract. The proxy
 * (`src/pages/admin/redaccion/curate-ideas.ts`) does every real query: which
 * recent `articles` rows exist, which are already covered (picked/saved, or a
 * fuzzy title match against `posts`), and it persists the surviving candidates
 * as `editorial_candidates` rows. This function only picks the best stories out
 * of whatever list it is handed and frames each one in Spanish.
 *
 * Same auth as every editorial function (Bearer SCRAPE_SECRET,
 * verify_jwt=false in config.toml). `gemini-2.5-flash`, not the redactor's
 * `gemini-3.6-flash`: this is selection + framing, not full-article prose.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { EDITORIAL_LINE, STYLE_GUIDE } from '../editorial-redactor/prompt-context.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;

/** Hard cap regardless of what Gemini returns — a runaway batch is not "curated". */
const MAX_CANDIDATES = 8;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface InputArticle {
  sourceUrl: string;
  title: string;
  sourceName: string;
  excerpt: string;
  publishedAt: string;
}

interface Candidate {
  sourceUrl: string;
  proposedTitleEs: string;
  angle: string;
  rationale: string;
}

function buildPrompt(articles: InputArticle[], count: number): string {
  const listing = articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.sourceName}, ${a.publishedAt}] ${a.title}\n   URL: ${a.sourceUrl}\n   ${a.excerpt}`,
    )
    .join('\n\n');

  return `Eres el curador que propone a Fernando Val, cada día, qué noticias de coches eléctricos merecen convertirse en un artículo propio, escribiendo bajo su guía de estilo y su línea editorial que siguen a continuación.

${STYLE_GUIDE}

${EDITORIAL_LINE}

Aquí tienes ${articles.length} noticias ya recogidas, numeradas:

${listing}

Elige hasta ${count} de estas noticias, las que de verdad merezcan una pieza propia — no las traduzcas ni las resumas, PIÉNSALAS como haría un editor: qué ángulo tiene sentido para un lector español, qué pregunta se hace ese lector, por qué escribir sobre esto AHORA. Descarta las que sean puro ruido de marketing, las que ya estén muy trilladas, o las que se solapen entre sí (si dos noticias de la lista van del mismo tema, elige solo una).

Para cada una que elijas, devuelve:
- "sourceUrl": copia EXACTA de la URL de la lista, nunca la inventes ni la modifiques.
- "proposedTitleEs": un titular en español, el que tendría el artículo.
- "angle": el enfoque editorial concreto, 1-2 frases. Qué va a argumentar la pieza, no de qué trata.
- "rationale": por qué escribir sobre esto ahora, 1-2 frases.

No inventes cifras, citas ni hechos que no estén en el resumen de cada noticia. Si ninguna noticia de la lista merece una pieza, devuelve una lista vacía.`;
}

async function generate(articles: InputArticle[], count: number): Promise<Candidate[] | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot curate ideas');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(articles, count) }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          candidates: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                sourceUrl: { type: 'STRING' },
                proposedTitleEs: { type: 'STRING' },
                angle: { type: 'STRING' },
                rationale: { type: 'STRING' },
              },
              required: ['sourceUrl', 'proposedTitleEs', 'angle', 'rationale'],
            },
          },
        },
        required: ['candidates'],
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
    if (!Array.isArray(parsed.candidates)) return null;

    return parsed.candidates;
  } catch (error) {
    console.error('editorial-curator error:', error);
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

    const rawArticles = (body as Record<string, unknown>).articles;
    if (!Array.isArray(rawArticles)) {
      return json({ error: 'Falta la lista de artículos.' }, 400);
    }

    const articles: InputArticle[] = rawArticles
      .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
      .map((a) => ({
        sourceUrl: typeof a.sourceUrl === 'string' ? a.sourceUrl : '',
        title: typeof a.title === 'string' ? a.title : '',
        sourceName: typeof a.sourceName === 'string' ? a.sourceName : '',
        excerpt: typeof a.excerpt === 'string' ? a.excerpt : '',
        publishedAt: typeof a.publishedAt === 'string' ? a.publishedAt : '',
      }))
      .filter((a) => a.sourceUrl && a.title);

    // Nothing to curate — a normal outcome (e.g. everything recent is already
    // covered), not an error, so no Gemini call is spent on an empty prompt.
    if (articles.length === 0) return json({ ok: true, candidates: [] });

    const rawCount = (body as Record<string, unknown>).count;
    const count = Math.max(1, Math.min(MAX_CANDIDATES, typeof rawCount === 'number' ? rawCount : 6));

    const result = await generate(articles, count);
    if (!result) return json({ error: 'AI generation failed' }, 502);

    const validUrls = new Set(articles.map((a) => a.sourceUrl));
    const candidates: Candidate[] = result
      .filter(
        (c): c is Candidate =>
          typeof c === 'object' &&
          c !== null &&
          typeof c.sourceUrl === 'string' &&
          validUrls.has(c.sourceUrl) && // never trust an invented URL — same lesson as the redactor
          typeof c.proposedTitleEs === 'string' &&
          c.proposedTitleEs.trim().length > 0 &&
          typeof c.angle === 'string' &&
          c.angle.trim().length > 0 &&
          typeof c.rationale === 'string' &&
          c.rationale.trim().length > 0,
      )
      .slice(0, MAX_CANDIDATES);

    return json({ ok: true, candidates });
  } catch (err) {
    console.error('editorial-curator error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
