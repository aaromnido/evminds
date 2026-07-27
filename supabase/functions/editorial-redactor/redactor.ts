/**
 * Service: the A3 redactor — one Gemini call per channel, brief in, structured
 * draft out.
 *
 * Mirrors `ai-summary.ts`'s shape exactly (retry loop, `response_schema`,
 * `thinkingConfig: { thinkingBudget: 0 }`), because it is the established,
 * working pattern for a Gemini-calling Edge Function in this codebase. No
 * database access here: the caller (the admin proxy) resolves the sibling
 * Motor.es draft before calling and persists the result after, via the
 * client's existing autosave — this stays a pure "structured text in,
 * structured text out" function, like `generateSummary()`.
 */

import {
  EDITORIAL_LINE,
  EVMINDS_VOICE_NOTE,
  MOTOR_STYLE_GUIDE,
  MOTOR_VOICE_NOTE,
  STYLE_GUIDE,
} from './prompt-context.ts';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
// Linear backoff between attempts: 500ms, 1s, 1.5s, 2s (total worst case ~5s).
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Channel = 'motor' | 'evminds';

/** The sibling Motor.es draft, read by the proxy — never by this function. */
export interface MotorDraftForEvminds {
  title: string;
  lead: string;
  body: string;
}

export interface RedactorInput {
  channel: Channel;
  briefTitle: string;
  briefAngle: string;
  /** R1 links already fetched & concatenated by the caller; "" if none. */
  referenceContent: string;
  /**
   * Known from the idea's source, when there is one — the ONLY source of
   * Motor.es' `fuente`/`url_fuente`. The model never fills these in; it
   * doesn't even see them as output fields (Fer, 2026-07-27: an invented one
   * turned out to be a dead link).
   */
  sourceName: string | null;
  sourceUrl: string | null;
  /** EVminds only. "Qué ha cambiado esta semana", Fer's free text. */
  weeklyNotes: string | null;
  /** EVminds only. Present only when the sibling Motor.es draft is `published`. */
  motorDraft: MotorDraftForEvminds | null;
}

export interface MotorDraftResult {
  title: string;
  listTitle: string;
  discoverTitle: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  body: string;
  brand: string;
  model: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
}

export interface EvmindsDraftResult {
  title: string;
  body: string;
}

function str(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function strArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/**
 * Demotes a stray top-level `# ` to `## `, everywhere it appears.
 *
 * Enforced in code, not trusted to the prompt (the plan's own words): Motor.es'
 * template prints its own `<h1>`, so a model-authored one would render twice.
 * Applied to EVminds too, since the house style guide already reserves `#` for
 * nothing at all (`##`/`###` only) regardless of channel.
 */
function demoteH1(markdown: string): string {
  return markdown.replace(/^#(?!#)[ \t]*/gm, '## ');
}

/**
 * Strips any Markdown link in the prose whose URL isn't literally present in
 * the reference content, keeping the link's visible text so the sentence
 * still reads (Fer, 2026-07-27: a fabricated citation link inside "Cuerpo
 * noticia" turned out to be a dead page).
 *
 * Enforced in code, not trusted to the prompt: the prompt already says never
 * to invent one, but with no real reference material today (R1 link fetching
 * isn't wired into this call yet, so `referenceContent` is normally ""), the
 * model kept inventing a link to satisfy the house style's "con enlace cuando
 * lo hay" — this is the backstop for exactly that case.
 */
function stripUnverifiedLinks(markdown: string, referenceContent: string): string {
  // No `https?://` requirement on purpose: a fabricated "link" is just as
  // often a bare domain ("tesla.com/superchargers") as a full URL.
  return markdown.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (match, text, url) =>
    referenceContent.includes(url) ? match : text,
  );
}

/**
 * Cuts the body dead at the first sign of a "Fuentes consultadas" or
 * "Noticias relacionadas" section, whatever heading level or formatting the
 * model gave it. Totally banned, no exceptions, even with a real fetched
 * source (Fer, 2026-07-27, after two rounds of catching this in a
 * screenshot): he adds his own sources by hand when he wants them, the
 * redactor never writes either section, full stop.
 *
 * A truncation rather than a targeted removal, and deliberately not anchored
 * to any particular heading syntax — round 1 of this fix matched only `##`
 * and the section survived because the model used a different level. Both
 * phrases are always the last thing in the piece by Motor.es' own convention
 * (`motor-es-style-guide.md`, "Práctica propia, no regla suya"), so cutting
 * everything from the first occurrence onward is safe and catches both in one
 * pass regardless of how either is formatted.
 */
function stripFabricatedClosingSections(markdown: string): string {
  const match = markdown.match(/fuentes consultadas|noticias relacionadas/i);
  return match ? markdown.slice(0, match.index).trimEnd() : markdown;
}

function buildBriefBlock(input: RedactorInput): string {
  const lines = [`Titular de partida: ${input.briefTitle}`, `Ángulo: ${input.briefAngle}`];
  if (input.referenceContent.trim()) {
    lines.push(
      '',
      'Contenido de referencia (fuentes ya leídas para esta pieza, úsalo como material, no lo cites literalmente salvo que cites la fuente):',
      input.referenceContent.trim(),
    );
  }
  return lines.join('\n');
}

function buildMotorPrompt(input: RedactorInput): string {
  return `Eres el redactor editorial de Motor.es (un medio externo, no EVminds), escribiendo bajo la guía de estilo y la línea editorial de Fernando Val que siguen a continuación. Sigue TODAS sus reglas.

REGLA INQUEBRANTABLE sobre fuentes y enlaces: NUNCA inventes un medio, un redactor, una cita, un enlace ni una URL que no te haya sido dada explícitamente en el contenido de referencia de más abajo. Esto vale igual para el texto (entradilla y cuerpo) que para los campos del formulario: ni "fuente" ni "url fuente" forman parte de lo que generas — no existen como campos de salida, Fer los añade él mismo, a mano, cuando los hay. Si no tienes una fuente real y verificable que citar, no cites ninguna: mejor un texto sin cita que una cita o un enlace inventados.

PROHIBIDO SIN EXCEPCIÓN: un bloque "Fuentes consultadas" o una sección de "Noticias relacionadas" al final del cuerpo. Esto NO es condicional a si tienes fuentes reales o no — aunque las tuvieras, tampoco los añadas. Fer los añade él mismo, a mano, cuando quiere tenerlos. La práctica de la casa que se menciona más abajo describe algo que hace Fer, no algo que tengas que reproducir tú. El cuerpo termina en el último párrafo del contenido, sin ningún bloque de cierre de ningún tipo.

${STYLE_GUIDE}

${EDITORIAL_LINE}

${MOTOR_VOICE_NOTE}

${MOTOR_STYLE_GUIDE}

Brief de la pieza:

${buildBriefBlock(input)}

Genera un JSON con estos campos exactos:
- "titulo": el titular. Apunta a 65 caracteres, sin pasarte mucho.
- "titulo_listados": para listados, misma longitud recomendada. Si no tienes uno genuinamente distinto del titular, cadena vacía "" (el panel copiará el titular).
- "titulo_discover": para Google Discover. En primera persona o con gancho, nunca clickbait (ver la sección "Título Discover" de arriba).
- "meta_titulo": SOLO si "titulo" se pasa bastante de 65 caracteres o queda mal como resultado de búsqueda. Si no, cadena vacía "".
- "meta_descripcion": SOLO si añade algo que el titular no dice, una única frase, apunta a 155 caracteres. Si no aporta nada nuevo, cadena vacía "".
- "entradilla": un párrafo de apertura de 40 a 45 palabras (50 como máximo, contado en PALABRAS, no caracteres). Formato en línea permitido (negrita, cursiva, enlace), SIN encabezados. El "cuerpo" no debe repetirla.
- "cuerpo": el cuerpo de la noticia en Markdown, empezando DESPUÉS de la entradilla (nunca la repite ni la resume otra vez). Usa "##" para los encabezados de sección, NUNCA "#".
- "marca": la marca del coche protagonista, si la pieza va de un coche concreto. Si no, cadena vacía "".
- "modelo": el modelo, en las mismas condiciones que "marca".
- "tags": entre 2 y 5, prefiriendo los que ya existen en el vocabulario de Motor.es (listados arriba).

Nota: NO generes "fuente" ni "url_fuente" — esos dos campos no están en el JSON de salida, se rellenan aparte con el dato ya conocido (ver la regla inquebrantable de arriba).`;
}

function buildEvmindsPrompt(input: RedactorInput): string {
  const motorBlock = input.motorDraft
    ? `\nTexto ya publicado en Motor.es hace una semana. Esta pieza debe ADAPTARLO, nunca traducirlo ni copiar sus párrafos de valoración o de tono (ver "Cómo se adapta el texto de Motor.es" arriba — se conservan los hechos y las cifras, se rehace el titular, la apertura, el orden de las secciones y el cierre):
Título: ${input.motorDraft.title}
Entradilla: ${input.motorDraft.lead}
Cuerpo:
${input.motorDraft.body}\n`
    : '';
  const weeklyBlock = input.weeklyNotes?.trim()
    ? `\nQué ha cambiado esta semana, según Fer (incorpóralo, es material que Motor.es no tenía):\n${input.weeklyNotes.trim()}\n`
    : '';

  return `Eres el redactor editorial de EVminds, escribiendo bajo la guía de estilo y la línea editorial de Fernando Val que siguen a continuación. Sigue TODAS sus reglas.

REGLA INQUEBRANTABLE sobre fuentes y enlaces: NUNCA inventes un medio, una cita, un enlace ni una URL que no te haya sido dada explícitamente en el contenido de referencia o en el texto de Motor.es de más abajo (si los hay). Si no tienes una fuente real y verificable que citar, no cites ninguna: mejor un texto sin cita que una cita o un enlace inventados. Y PROHIBIDO SIN EXCEPCIÓN, tengas fuentes o no: un bloque "Fuentes consultadas" o una sección de "Noticias relacionadas" al final. Fer los añade él mismo, a mano, si quiere tenerlos.

${STYLE_GUIDE}

${EDITORIAL_LINE}

${EVMINDS_VOICE_NOTE}

Brief de la pieza:

${buildBriefBlock(input)}
${motorBlock}${weeklyBlock}
Genera un JSON con estos campos exactos:
- "titulo": el titular, en la voz de EVminds (segunda persona del plural, la flota de casa como vara de medir). ${input.motorDraft ? 'No puede compartir las primeras palabras con el título de Motor.es de arriba.' : ''}
- "cuerpo": el cuerpo completo del artículo en Markdown. Usa "##" para los encabezados de sección, NUNCA "#".`;
}

function buildMotorResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      titulo: { type: 'STRING' },
      titulo_listados: { type: 'STRING' },
      titulo_discover: { type: 'STRING' },
      meta_titulo: { type: 'STRING' },
      meta_descripcion: { type: 'STRING' },
      entradilla: { type: 'STRING' },
      cuerpo: { type: 'STRING' },
      marca: { type: 'STRING' },
      modelo: { type: 'STRING' },
      tags: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: [
      'titulo',
      'titulo_listados',
      'titulo_discover',
      'meta_titulo',
      'meta_descripcion',
      'entradilla',
      'cuerpo',
      'marca',
      'modelo',
      'tags',
    ],
  };
}

function buildEvmindsResponseSchema() {
  return {
    type: 'OBJECT',
    properties: {
      titulo: { type: 'STRING' },
      cuerpo: { type: 'STRING' },
    },
    required: ['titulo', 'cuerpo'],
  };
}

function parseMotor(raw: unknown, input: RedactorInput): MotorDraftResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = str(obj, 'titulo');
  const lead = str(obj, 'entradilla');
  const body = str(obj, 'cuerpo');
  if (!title || !lead || !body) return null;

  return {
    title,
    listTitle: str(obj, 'titulo_listados'),
    discoverTitle: str(obj, 'titulo_discover'),
    metaTitle: str(obj, 'meta_titulo'),
    metaDescription: str(obj, 'meta_descripcion'),
    lead: stripUnverifiedLinks(lead, input.referenceContent),
    body: stripFabricatedClosingSections(
      demoteH1(stripUnverifiedLinks(body, input.referenceContent)),
    ),
    brand: str(obj, 'marca'),
    model: str(obj, 'modelo'),
    // NEVER the model's guess (Fer, 2026-07-27: he clicked a model-invented
    // URL and it didn't exist). "fuente"/"url_fuente" aren't even in the
    // response schema above — the only source of truth is what the idea
    // already carried, and empty stays empty until Fer types it in by hand.
    sourceName: input.sourceName ?? '',
    sourceUrl: input.sourceUrl ?? '',
    tags: strArray(obj, 'tags').slice(0, 5),
  };
}

function parseEvminds(raw: unknown, input: RedactorInput): EvmindsDraftResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = str(obj, 'titulo');
  const body = str(obj, 'cuerpo');
  if (!title || !body) return null;

  return {
    title,
    body: stripFabricatedClosingSections(
      demoteH1(stripUnverifiedLinks(body, input.referenceContent)),
    ),
  };
}

/**
 * Generates one channel's draft from the shared brief.
 * @returns the typed result, or null on any failure (missing key, network,
 *          retries exhausted, invalid JSON, or a required field empty).
 */
export async function generateDraft(
  input: RedactorInput,
): Promise<MotorDraftResult | EvmindsDraftResult | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; cannot generate draft');
    return null;
  }

  const prompt = input.channel === 'motor' ? buildMotorPrompt(input) : buildEvmindsPrompt(input);
  const schema = input.channel === 'motor' ? buildMotorResponseSchema() : buildEvmindsResponseSchema();

  const requestBody = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      response_mime_type: 'application/json',
      response_schema: schema,
      // gemini-2.5-flash is a "thinking" model by default; disable to free the
      // full output budget for the actual draft (same trade-off as ai-summary.ts).
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

    const result =
      input.channel === 'motor' ? parseMotor(parsed, input) : parseEvminds(parsed, input);
    if (!result) {
      console.error('Gemini response failed schema validation:', text);
      return null;
    }

    return result;
  } catch (error) {
    console.error('Redactor error:', error);
    return null;
  }
}
