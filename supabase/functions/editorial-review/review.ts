/**
 * Service: the A3 reviewer — an already-written article in, a structured
 * checklist of findings out. Judges what the redactor cannot guarantee for
 * itself: whether the result actually reads well and matches what was asked
 * for, not just whether it followed the formatting rules already enforced in
 * code by `redactor.ts`'s own transforms (no `#`, no fabricated links, no
 * closing sections).
 *
 * No database access here, same contract as `redactor.ts`: the caller (the
 * admin proxy) resolves everything needed and persists nothing — this is a
 * pure "article in, findings out" function.
 */

import {
  EDITORIAL_LINE,
  EVMINDS_VOICE_NOTE,
  LINKING_GUIDE,
  MOTOR_STYLE_GUIDE,
  MOTOR_VOICE_NOTE,
  STYLE_GUIDE,
} from '../editorial-redactor/prompt-context.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Channel = 'motor' | 'evminds';
export type Severity = 'recomendacion' | 'aviso' | 'danger';

export interface ReviewInput {
  channel: Channel;
  /** Step ①'s brief title, the "Tema" the piece is supposed to be about. */
  briefTitle: string;
  /** Step ②'s brief angle, the "Enfoque" the piece is supposed to take. */
  briefAngle: string;
  title: string;
  body: string;
}

export interface ReviewFinding {
  severidad: Severity;
  mensaje: string;
  /** How to fix it, or "" when the message already says it plainly. */
  recomendacion: string;
}

export interface ReviewResult {
  contenido: ReviewFinding[];
  forma: ReviewFinding[];
  ortografia: ReviewFinding[];
}

function buildPrompt(input: ReviewInput): string {
  const channelName = input.channel === 'motor' ? 'Motor.es' : 'EVminds';
  const channelGuides =
    input.channel === 'motor' ? `${MOTOR_VOICE_NOTE}\n\n${MOTOR_STYLE_GUIDE}` : EVMINDS_VOICE_NOTE;

  return `Eres el revisor editorial de ${channelName}, revisando un artículo ya escrito contra el criterio de Fernando Val. No reescribes nada: solo evalúas y señalas, con la misma exigencia que él aplicaría.

Tema de partida (brief, paso ①): ${input.briefTitle}
Enfoque (brief, paso ②): ${input.briefAngle}

${STYLE_GUIDE}

${EDITORIAL_LINE}

${channelGuides}

${LINKING_GUIDE}

Artículo a revisar:

Título: ${input.title}

Cuerpo:
${input.body}

Evalúa el artículo en tres bloques. Cada uno es una lista de hallazgos, y puede estar vacía si no hay nada que señalar ahí: eso es una buena noticia, no un fallo tuyo, así que no inventes problemas para rellenar.

- "contenido": ¿el artículo se ajusta de verdad al Tema y al Enfoque de arriba? ¿Se entiende fácil, sin dar por sabido lo que no lo es ni meter jerga innecesaria?
- "forma": ¿respeta la guía de estilo (voz, tono, mecánica de escritura)? ¿La estructura es lógica y coherente, con encabezados que se entienden sueltos? Y el enlazado: si el artículo tiene enlaces, ¿cumplen los criterios de la guía de enlazado de arriba (regla de oro, anchors variados y con contexto, nada en la entradilla o el arranque, sin forzar enlaces que no aporten)? Si el artículo no tiene ningún enlace, eso NO es un problema a señalar: la guía es orientación para cuando los hay, no una obligación de meterlos.
- "ortografia": faltas de ortografía y erratas, letra por letra. Sé exhaustivo aquí, es lo más grave si aparece.

Cada hallazgo lleva:
- "severidad": "recomendacion" (sugerencia de mejora, no vinculante), "aviso" (incumplimiento moderado de algo de arriba), o "danger" (grave; las faltas de ortografía y las erratas son casi siempre "danger").
- "mensaje": qué está pasando, concreto y localizable en el texto (cita la frase o la palabra exacta cuando puedas).
- "recomendacion": cómo solucionarlo. Cadena vacía "" si el mensaje ya lo deja claro.`;
}

function buildResponseSchema() {
  const findingSchema = {
    type: 'OBJECT',
    properties: {
      severidad: { type: 'STRING', enum: ['recomendacion', 'aviso', 'danger'] },
      mensaje: { type: 'STRING' },
      recomendacion: { type: 'STRING' },
    },
    required: ['severidad', 'mensaje', 'recomendacion'],
  };

  return {
    type: 'OBJECT',
    properties: {
      contenido: { type: 'ARRAY', items: findingSchema },
      forma: { type: 'ARRAY', items: findingSchema },
      ortografia: { type: 'ARRAY', items: findingSchema },
    },
    required: ['contenido', 'forma', 'ortografia'],
  };
}

const VALID_SEVERITIES = new Set<string>(['recomendacion', 'aviso', 'danger']);

function parseFindings(raw: unknown): ReviewFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const rawSeverity = typeof item.severidad === 'string' ? item.severidad : '';
      const severidad = (VALID_SEVERITIES.has(rawSeverity) ? rawSeverity : 'aviso') as Severity;
      const mensaje = typeof item.mensaje === 'string' ? item.mensaje.trim() : '';
      const recomendacion = typeof item.recomendacion === 'string' ? item.recomendacion.trim() : '';
      return { severidad, mensaje, recomendacion };
    })
    .filter((finding) => finding.mensaje.length > 0);
}

function parseResult(raw: unknown): ReviewResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    contenido: parseFindings(obj.contenido),
    forma: parseFindings(obj.forma),
    ortografia: parseFindings(obj.ortografia),
  };
}

/**
 * Reviews one article draft against Tema, Enfoque, and every editorial guide.
 * @returns the typed result, or null on any failure (missing key, network,
 *          retries exhausted, invalid JSON).
 */
export async function reviewDraft(input: ReviewInput): Promise<ReviewResult | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot review draft');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    generationConfig: {
      // Lower than the redactor's 0.7 on purpose: this is judgment, not prose,
      // and a more deterministic read is what makes re-running after a tiny
      // edit feel like a real re-check instead of a different opinion.
      temperature: 0.3,
      maxOutputTokens: 4096,
      response_mime_type: 'application/json',
      response_schema: buildResponseSchema(),
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
        console.warn(
          `Gemini ${response.status} on attempt ${attempt}/${MAX_ATTEMPTS}; retrying in ${RETRY_DELAY_MS * attempt}ms`,
        );
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      const errBody = await response.text();
      console.error(`Gemini API error (${response.status}): ${errBody}`);
      return null;
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 'unknown';
      console.error(`Gemini API exhausted retries (last status: ${status})`);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      console.error('Gemini response missing text content:', JSON.stringify(data));
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Gemini response not valid JSON:', text);
      return null;
    }

    const result = parseResult(parsed);
    if (!result) {
      console.error('Gemini response failed schema validation:', text);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Reviewer error:', error);
    return null;
  }
}
