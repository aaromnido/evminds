/**
 * Edge Function: "Desarrollar con IA" on step ②'s angle field (`DefineAngleStep`).
 *
 * Same job as `editorial-expand-idea`, minus the "por qué ahora" half — step ②
 * only shows the angle, not a separate rationale field. Kept as its own
 * function rather than a shared one (Fer's call, 2026-07-27): each mock gets
 * its own isolated Edge Function.
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

function buildPrompt(title: string, angle: string): string {
  return `Eres el editor que ayuda a Fernando Val a desarrollar el enfoque de un artículo suyo, escribiendo bajo su guía de estilo y su línea editorial que siguen a continuación.

${STYLE_GUIDE}

${EDITORIAL_LINE}

Titular de partida: ${title || '(sin título todavía)'}
Enfoque tal y como lo ha escrito Fer: ${angle || '(sin desarrollar todavía)'}

Devuelve un JSON con un único campo "angle": el enfoque ampliado, con los matices que la frase original no tenía. Cuéntalo desde la experiencia real de conducir un eléctrico a diario en España, no desde la ficha técnica, contrastando las cifras oficiales con lo que se ve en uso y aterrizando cada dato en euros y kilómetros de aquí. No inventes hechos, cifras ni fuentes que no estén en lo que Fer ha escrito.`;
}

async function generate(title: string, angle: string): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot expand angle');
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
        properties: { angle: { type: 'STRING' } },
        required: ['angle'],
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
    const result = typeof parsed.angle === 'string' ? parsed.angle.trim() : '';
    return result || null;
  } catch (error) {
    console.error('editorial-expand-angle error:', error);
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

    return json({ ok: true, angle: result });
  } catch (err) {
    console.error('editorial-expand-angle error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
