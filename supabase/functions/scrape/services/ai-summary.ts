/**
 * Service: AI-generated article summary + transparency warnings
 *
 * Calls Gemini Flash 2.0 with the article title and excerpt, expecting a
 * structured JSON response with `summary` and `warnings`. On any failure
 * path returns {summary: null, warnings: []} so the surrounding scraper
 * inserts the article without AI fields rather than aborting the row.
 */

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Mirror of the canonical type in src/lib/ai-warnings.ts. The Edge Function
// cannot import from the frontend tree (different runtime), so the union is
// duplicated. Keep both in sync when adding new warning types.
export type WarningType =
  | 'price_non_european'
  | 'price_subsidized'
  | 'autonomy_cltc'
  | 'autonomy_wltp_no_real'
  | 'launch_non_european'
  | 'prototype_as_product';

export interface SummaryWarning {
  type: WarningType;
}

export interface SummaryResult {
  summary: string | null;
  warnings: SummaryWarning[];
  /** Soft 1-2 sentence invitation to comment, tied to the article's key debate. */
  discussionPrompt?: string;
  /** Spanish translation of the original title — only set when source.lang !== 'es' */
  translatedTitle?: string;
  /** Spanish translation of the original excerpt — only set when source.lang !== 'es' */
  translatedExcerpt?: string;
}

const VALID_WARNING_TYPES: ReadonlySet<WarningType> = new Set<WarningType>([
  'price_non_european',
  'price_subsidized',
  'autonomy_cltc',
  'autonomy_wltp_no_real',
  'launch_non_european',
  'prototype_as_product',
]);

const EMPTY: SummaryResult = { summary: null, warnings: [] };

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
// Linear backoff between attempts: 500ms, 1s, 1.5s, 2s (total worst case ~5s).
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(
  title: string,
  excerpt: string,
  articleUrl: string,
  lang: string,
): string {
  const isEnglish = lang.toLowerCase().startsWith('en');

  const intro = isEnglish
    ? `Eres un editor de noticias sobre vehículos eléctricos para el mercado español (ES-ES). Recibes un artículo en inglés y debes generar TODO en español de España, incluida la traducción del título y el extracto originales.

A partir del título y extracto en inglés, genera:`
    : `Eres un editor de noticias sobre vehículos eléctricos para el mercado español (ES-ES).
Dado un título y un extracto, genera:`;

  const sharedBody = `1. Un "summary" de 5 párrafos (10-15 frases en total) en español de España. Es una síntesis editorial, NO un copy-paste del extracto. Tono periodístico, neutro, informativo. Separa los párrafos con un doble salto de línea (\\n\\n).

REGLA CRÍTICA contra alucinaciones — NO inventes datos técnicos que no estén en el extracto original (ciclo de homologación CLTC/WLTP, mercados geográficos de lanzamiento, capacidad de batería, autonomía oficial, precios, fechas, nombres de personas, plantas de fabricación, contextos comerciales). Limítate a parafrasear, sintetizar y dar contexto sobre lo que SÍ aparece en el texto. Si el extracto no menciona un dato, no lo añadas y no especules sobre él. Mejor un resumen escueto y honesto que uno rico y fabricado.

Reglas de estilo en español:
- NO uses guiones largos (—) como inciso. En español es más natural separar con comas. Ejemplo correcto: "La batería, según el comunicado, ofrece 900 km". Ejemplo INCORRECTO: "La batería —según el comunicado— ofrece 900 km".
- Marca con negritas (sintaxis Markdown: \`**texto**\`) los elementos clave del párrafo. Combina dos tipos de resalte:
  · Palabras sueltas o parejas cortas para cifras, nombres de modelo, términos técnicos, fechas (ej. \`**900 km**\`, \`**CLTC**\`, \`**2027**\`).
  · Frases o partes de frase que recojan una idea clave o una afirmación importante del párrafo (ej. \`**recarga al 80% en 5 minutos**\`, \`**sin fecha confirmada para Europa**\`).
  Usa 3-6 destacados por párrafo. Nunca pongas en negrita una frase entera. El objetivo es que el texto sea escaneable y dinámico.

2. Un array "warnings" con TIPOS de aviso de transparencia. Cada elemento es un objeto con un único campo "type". Si no hay ninguno, devuelve [].

REGLA CRÍTICA — solo dispara un warning si su ángulo aparece de forma LITERAL en el título o el extracto originales. NO infieras por marca, plataforma, magnitud de la cifra de autonomía, geografía del fabricante, ni por contexto general del sector. En la duda, NO añadas el warning: mejor un falso negativo que un falso positivo.

Tipos válidos de warning (el campo "type" debe coincidir exactamente):
- "price_non_european": solo si el precio se da literalmente en yuanes, dólares para mercado USA, o cualquier contexto explícitamente no europeo. Marca europea con precios en euros NO dispara este warning.
- "price_subsidized": solo si el extracto menciona literalmente subvenciones, ayudas públicas, descuentos por financiación o equivalentes.
- "autonomy_cltc": solo si el extracto menciona literalmente "CLTC", "ciclo chino" u "homologación china". Una cifra de autonomía alta NO basta para asumir CLTC.
- "autonomy_wltp_no_real": solo si el extracto da una cifra WLTP y, además, omite cualquier matiz de uso real. Aplicar con mucha cautela.
- "launch_non_european": solo si el extracto indica que el lanzamiento es exclusivo de un mercado no europeo (China, USA, Asia). Un lanzamiento europeo escalonado, retrasado o con ambición global NO dispara este warning.
- "prototype_as_product": solo si el extracto presenta una tecnología en fase prototipo como producto comercial disponible.

3. Un "discussion_prompt": invitación a comentar de 2-3 frases en español de España que:
- Identifique un ángulo real e interesante del artículo (técnico, comercial, estratégico, contextual, de expectativas). NO tiene que ser polémico ni provocador, basta con que dé pie a una conversación honesta.
- Mencione algo CONCRETO del contenido. Nada genérico tipo "¿qué te parece?".
- Tono BLANCO, neutro, honesto. Reconoce el hecho noticioso SIN ironía y SIN juicio. NUNCA cínico, NUNCA provocador, NUNCA marketinero, NUNCA agresivo con la noticia.
- NO inyectes opinión editorial. Evita palabras como "arriesgado", "puro postureo", "promesas vacías", "modo titular", "marketing del 100%", "coleccionando promesas", ni frases tipo "dice mucho" / "dice bastante". Deja que sea el lector el que se moje, no tú.
- Estructura recomendada: (a) una observación neutral del hecho, (b) una pregunta real y abierta sobre cómo lo ve el lector, (c) una invitación EXPLÍCITA y suave a dejar opinión.
- Cierre EXPLÍCITO a comentar, variando la forma en cada artículo: "Cuéntanos.", "Cuéntanos qué piensas.", "Cuéntanos cómo lo ves.", "Déjanos tu opinión.", "Déjanos tu lectura.", "Danos tu lectura.", "Nos interesa leerte.", "¿Tú cómo lo ves? Cuéntanos.", etc.
- NO empieces siempre con "¿". Alterna estructuras.
- Sin negritas, sin Markdown, sin guiones largos.

Ejemplos del tono buscado (referencia exacta):
- "El primer Ferrari eléctrico llega con la firma de un ex-Apple en el diseño, una mezcla poco habitual. ¿Te encaja con el espíritu del Cavallino o no acabas de verlo? Cuéntanos."
- "Un SUV con 640 km de autonomía por 18.000 dólares es una cifra muy llamativa, aunque para el mercado chino. ¿Te interesaría si llegase a Europa, aunque fuera al precio europeo habitual? Déjanos tu opinión."
- "Los ánodos de silicio prometen mejor gestión térmica, y AMG ha decidido apostar por ello junto a Sila. ¿Crees que las prestaciones reales acompañarán al anuncio? Cuéntanos qué piensas."
- "El Gamma es la pieza grande del relanzamiento de Lancia, y compartir plataforma con Peugeot y Citroën tiene su sentido industrial. ¿Tienes una opinión sobre el rumbo que está tomando la marca? Nos interesa leerte."`;

  const translationSections = isEnglish
    ? `

4. Un "translated_title": traducción al español de España del título original. Periodística, natural, NO literal. Preserva el sentido y el matiz. Sin negritas, sin Markdown.

5. Un "translated_excerpt": traducción al español de España del extracto original. Mismo tono que el del original. Sin negritas, sin Markdown.`
    : '';

  const outputExample = isEnglish
    ? `{"summary": "...", "warnings": [{"type": "autonomy_cltc"}], "discussion_prompt": "...", "translated_title": "...", "translated_excerpt": "..."}`
    : `{"summary": "...", "warnings": [{"type": "autonomy_cltc"}, {"type": "launch_non_european"}], "discussion_prompt": "..."}`;

  const inputBlock = isEnglish
    ? `Título original (inglés): ${title}
Extracto original (inglés): ${excerpt}
URL fuente: ${articleUrl}`
    : `Título: ${title}
Extracto: ${excerpt}
URL fuente: ${articleUrl}`;

  return `${intro}

${sharedBody}${translationSections}

Formato de salida (ejemplo):
${outputExample}

${inputBlock}`;
}

function buildResponseSchema(isEnglish: boolean) {
  const properties: Record<string, unknown> = {
    summary: { type: 'STRING' },
    warnings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { type: { type: 'STRING' } },
        required: ['type'],
      },
    },
    discussion_prompt: { type: 'STRING' },
  };
  const required = ['summary', 'warnings', 'discussion_prompt'];

  // For non-Spanish sources, also require Spanish translations of title/excerpt
  // so the article can be stored in Spanish in the database.
  if (isEnglish) {
    properties.translated_title = { type: 'STRING' };
    properties.translated_excerpt = { type: 'STRING' };
    required.push('translated_title', 'translated_excerpt');
  }

  return { type: 'OBJECT', properties, required };
}

function parseAndValidate(raw: unknown): SummaryResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.summary !== 'string' || obj.summary.trim().length < 20) {
    return null;
  }
  if (!Array.isArray(obj.warnings)) return null;

  const warnings: SummaryWarning[] = [];
  const seen = new Set<WarningType>();
  for (const w of obj.warnings) {
    if (!w || typeof w !== 'object') continue;
    const wo = w as Record<string, unknown>;
    if (typeof wo.type !== 'string') continue;
    if (!VALID_WARNING_TYPES.has(wo.type as WarningType)) continue;
    if (seen.has(wo.type as WarningType)) continue;
    seen.add(wo.type as WarningType);
    warnings.push({ type: wo.type as WarningType });
  }

  const result: SummaryResult = { summary: obj.summary.trim(), warnings };
  if (typeof obj.discussion_prompt === 'string' && obj.discussion_prompt.trim()) {
    result.discussionPrompt = obj.discussion_prompt.trim();
  }
  if (typeof obj.translated_title === 'string' && obj.translated_title.trim()) {
    result.translatedTitle = obj.translated_title.trim();
  }
  if (typeof obj.translated_excerpt === 'string' && obj.translated_excerpt.trim()) {
    result.translatedExcerpt = obj.translated_excerpt.trim();
  }
  return result;
}

/**
 * Generates an AI summary + transparency warnings for an article.
 * @param title - Article title in the source's language
 * @param excerpt - Article excerpt in the source's language
 * @param articleUrl - Original source URL (passed to the model for context)
 * @param lang - Source language code (e.g. 'es', 'en'). Determines the
 *               language of the generated summary and warnings.
 * @returns {summary, warnings}; both null/empty on any failure
 */
export async function generateSummary(
  title: string,
  excerpt: string,
  articleUrl: string,
  lang: string,
): Promise<SummaryResult> {
  if (!title || !excerpt) return EMPTY;

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY missing; skipping AI summary');
    return EMPTY;
  }

  const isEnglish = lang.toLowerCase().startsWith('en');
  const requestBody = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(title, excerpt, articleUrl, lang) }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
      response_mime_type: 'application/json',
      response_schema: buildResponseSchema(isEnglish),
      // gemini-2.5-flash is a "thinking" model by default; disable to
      // free the full output budget for the actual response and cut
      // latency from ~10s to ~2-3s.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  try {
    let response: Response | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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
      return EMPTY;
    }

    if (!response || !response.ok) {
      const status = response?.status ?? 'unknown';
      console.error(`Gemini API exhausted retries (last status: ${status})`);
      return EMPTY;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      console.error('Gemini response missing text content:', JSON.stringify(data));
      return EMPTY;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Gemini response not valid JSON:', text);
      return EMPTY;
    }

    const validated = parseAndValidate(parsed);
    if (!validated) {
      console.error('Gemini response failed schema validation:', text);
      return EMPTY;
    }

    return validated;
  } catch (error) {
    console.error('AI summary error:', error);
    return EMPTY;
  }
}
