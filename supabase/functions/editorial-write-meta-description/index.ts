/**
 * Edge Function: "Escribir la meta descripción con IA" — Motor.es only,
 * on-demand (never prefilled, see `PublishChannelStep`'s own reasoning:
 * their CMS treats this as an override, not a default field).
 *
 * Built from the headline, NOT from the entradilla — one sentence for a
 * search result, a different ask from the paragraph that opens the piece.
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
  return `Eres el editor que ayuda a Fernando Val a escribir la meta descripción de un artículo de Motor.es, escribiendo bajo sus reglas de la casa que siguen a continuación.

${MOTOR_STYLE_GUIDE}

Titular del artículo: ${title}

Escribe la meta descripción: UNA única frase pensada para un resultado de búsqueda, apuntando a 155 caracteres. NO es la entradilla ni se parece a ella — no resumas el artículo, escribe la frase que haría clicar desde Google. No inventes datos ni cifras que no estén en el titular.

Devuelve un JSON con un único campo "metaDescription".`;
}

async function generate(title: string): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot write meta description');
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
        properties: { metaDescription: { type: 'STRING' } },
        required: ['metaDescription'],
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
    const result = typeof parsed.metaDescription === 'string' ? parsed.metaDescription.trim() : '';
    return result || null;
  } catch (error) {
    console.error('editorial-write-meta-description error:', error);
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

    return json({ ok: true, metaDescription: result });
  } catch (err) {
    console.error('editorial-write-meta-description error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
