/**
 * Edge Function: "Desarrollar con IA" on a hand-typed idea (step ①, `CreateIdeaDrawer`).
 *
 * One short Gemini call: a one-line title/angle in, a fuller angle plus a "why
 * now" rationale out. Same auth as the redactor (Bearer SCRAPE_SECRET,
 * verify_jwt=false in config.toml) and the same admin-proxy pattern — the
 * browser never holds the secret.
 *
 * `gemini-2.5-flash`, not the redactor's `gemini-3.6-flash`: that model swap
 * was scoped to the redactor alone (see `editorial-redactor/redactor.ts`),
 * and this is a short utility rewrite, not full-article prose.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { EDITORIAL_LINE, STYLE_GUIDE } from '../editorial-redactor/prompt-context.ts';

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

interface Result {
  angle: string;
  rationale: string;
}

function buildPrompt(title: string, angle: string): string {
  return `Eres el editor que ayuda a Fernando Val a desarrollar una idea de artículo suya, escribiendo bajo su guía de estilo y su línea editorial que siguen a continuación.

${STYLE_GUIDE}

${EDITORIAL_LINE}

Fer ha escrito esta idea, como le ha salido, a veces solo una frase:

Título propuesto: ${title || '(sin título todavía)'}
De qué va: ${angle || '(sin desarrollar todavía)'}

Desarróllala en dos campos:
- "angle": el enfoque ampliado, con los matices que la frase original no tenía. Enfócalo desde la experiencia real de conducir un eléctrico a diario en España, no desde la ficha técnica, y aterriza los datos en euros y kilómetros de aquí. No inventes cifras ni hechos concretos que Fer no te haya dado.
- "rationale": por qué tiene sentido escribirla ahora, en 2-3 frases.

No inventes hechos, cifras ni fuentes que no estén en lo que Fer ha escrito.`;
}

async function generate(title: string, angle: string): Promise<Result | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot expand idea');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(title, angle) }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1024,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          angle: { type: 'STRING' },
          rationale: { type: 'STRING' },
        },
        required: ['angle', 'rationale'],
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
    const resultAngle = typeof parsed.angle === 'string' ? parsed.angle.trim() : '';
    const rationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim() : '';
    if (!resultAngle || !rationale) return null;

    return { angle: resultAngle, rationale };
  } catch (error) {
    console.error('editorial-expand-idea error:', error);
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
      ? (body as Record<string, unknown>).title as string
      : '';
    const angle = typeof (body as Record<string, unknown>).angle === 'string'
      ? (body as Record<string, unknown>).angle as string
      : '';
    if (!title.trim() && !angle.trim()) {
      return json({ error: 'Falta título o enfoque de partida.' }, 400);
    }

    const result = await generate(title.trim(), angle.trim());
    if (!result) return json({ error: 'AI generation failed' }, 502);

    return json({ ok: true, ...result });
  } catch (err) {
    console.error('editorial-expand-idea error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
