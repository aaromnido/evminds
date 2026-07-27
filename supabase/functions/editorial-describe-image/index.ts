/**
 * Edge Function: "the alt text is written from the image" (Fer, 2026-07-26) —
 * the wizard's hero image described by the model itself, one plain sentence.
 *
 * The first multimodal Gemini call in this codebase: every other function
 * here sends text in, this one also sends the image as `inlineData`. Fetches
 * the image server-side (real images are Cloudinary `secure_url`s, always
 * absolute — see `src/lib/cloudinary.ts`) and base64-encodes it; Gemini's
 * inline-data path needs the bytes, not a URL it can fetch itself.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;
// Gemini's inline-data limit is ~20MB for the whole request; stay well under it.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Chunked, stack-safe base64 encoding (a naive spread over a big Uint8Array overflows). */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface FetchedImage {
  base64: string;
  mimeType: string;
}

/** Only http(s), so this can't be pointed at an internal/loopback address. */
function isFetchableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchImage(url: string): Promise<FetchedImage | null> {
  if (!isFetchableUrl(url)) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const contentLength = res.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;

    const mimeType = res.headers.get('content-type')?.split(';')[0].trim() || 'image/webp';
    if (!mimeType.startsWith('image/')) return null;

    return { base64: toBase64(buffer), mimeType };
  } catch (error) {
    console.error('editorial-describe-image fetch error:', error);
    return null;
  }
}

const PROMPT = `Describe esta fotografía en UNA sola frase, en español, para el atributo alt de una imagen (accesibilidad). Puramente descriptiva: qué se ve, en qué entorno, con qué luz o encuadre si es relevante. Nada de lenguaje comercial ni de opinión ("impresionante", "espectacular"...). No inventes datos que no se vean en la imagen (marca o modelo del coche solo si se lee con claridad).

Devuelve un JSON con un único campo "altText".`;

async function describe(image: FetchedImage): Promise<string | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot describe image');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: { altText: { type: 'STRING' } },
        required: ['altText'],
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
    const result = typeof parsed.altText === 'string' ? parsed.altText.trim() : '';
    return result || null;
  } catch (error) {
    console.error('editorial-describe-image error:', error);
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

    const imageUrl = typeof (body as Record<string, unknown>).imageUrl === 'string'
      ? ((body as Record<string, unknown>).imageUrl as string).trim()
      : '';
    if (!imageUrl) return json({ error: 'Falta la imagen.' }, 400);

    const image = await fetchImage(imageUrl);
    if (!image) return json({ error: 'No se pudo leer la imagen.' }, 502);

    const altText = await describe(image);
    if (!altText) return json({ error: 'AI generation failed' }, 502);

    return json({ ok: true, altText });
  } catch (err) {
    console.error('editorial-describe-image error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
