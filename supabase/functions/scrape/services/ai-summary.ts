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

function buildPrompt(
  title: string,
  excerpt: string,
  articleUrl: string,
  lang: string,
): string {
  const isEnglish = lang.toLowerCase().startsWith('en');

  if (isEnglish) {
    return `You are a news editor specialized in electric vehicles, writing for an audience of EV enthusiasts.
Given an article title and excerpt, generate:

1. A "summary" of 5 paragraphs (10-15 sentences total) in English. It must be an editorial synthesis, NOT a copy-paste of the excerpt. Journalistic, neutral, informative tone. Separate paragraphs with a double newline (\\n\\n).

Mark key concepts (figures, model names, technical terms, dates) in **bold** using Markdown syntax (\`**word**\`). Use bold sparingly: 3-6 expressions per paragraph maximum, not on full sentences. The goal is to make the text scannable and dynamic, not to highlight everything.

2. A "warnings" array containing transparency-warning TYPES. Each item is an object with a single "type" field. Only include a warning if it is clearly supported by the text. If there are none, return [].

Valid warning types (the "type" field must match exactly):
- "price_non_european": Price quoted in China or another non-European market
- "price_subsidized": Price includes subsidies, financing discounts, or government aid
- "autonomy_cltc": Range in CLTC cycle (Chinese homologation) without WLTP context
- "autonomy_wltp_no_real": WLTP range without real-world context
- "launch_non_european": Launch planned outside Europe
- "prototype_as_product": Prototype-stage technology presented as a commercial product

Output format example:
{"summary": "...", "warnings": [{"type": "autonomy_cltc"}, {"type": "launch_non_european"}]}

Title: ${title}
Excerpt: ${excerpt}
Source URL: ${articleUrl}`;
  }

  return `Eres un editor de noticias sobre vehículos eléctricos para el mercado español (ES-ES).
Dado un título y un extracto, genera:

1. Un "summary" de 5 párrafos (10-15 frases en total) en español de España. Es una síntesis editorial, NO un copy-paste del extracto. Tono periodístico, neutro, informativo. Separa los párrafos con un doble salto de línea (\\n\\n).

Reglas de estilo en español:
- NO uses guiones largos (—) como inciso. En español es más natural separar con comas. Ejemplo correcto: "La batería, según el comunicado, ofrece 900 km". Ejemplo INCORRECTO: "La batería —según el comunicado— ofrece 900 km".
- Marca con negritas (sintaxis Markdown: \`**palabra**\`) los conceptos clave: cifras, nombres de modelo, términos técnicos, fechas. Usa negritas con moderación, 3-6 expresiones por párrafo máximo, nunca sobre frases enteras. El objeto es que el texto sea escaneable y dinámico, no resaltar todo.

2. Un array "warnings" con TIPOS de aviso de transparencia. Cada elemento es un objeto con un único campo "type". Solo incluye un warning si está claramente respaldado por el texto. Si no hay ninguno, devuelve [].

Tipos válidos de warning (el campo "type" debe coincidir exactamente):
- "price_non_european": Precio mencionado en China u otro mercado no europeo
- "price_subsidized": Precio que incluye subvenciones, descuentos por financiación o ayudas
- "autonomy_cltc": Autonomía en ciclo CLTC (homologación china) sin contexto WLTP
- "autonomy_wltp_no_real": Autonomía WLTP sin contexto de uso real
- "launch_non_european": Lanzamiento previsto fuera de Europa
- "prototype_as_product": Tecnología en fase prototipo presentada como producto comercial

Formato de salida (ejemplo):
{"summary": "...", "warnings": [{"type": "autonomy_cltc"}, {"type": "launch_non_european"}]}

Título: ${title}
Extracto: ${excerpt}
URL fuente: ${articleUrl}`;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    warnings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
        },
        required: ['type'],
      },
    },
  },
  required: ['summary', 'warnings'],
};

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

  return { summary: obj.summary.trim(), warnings };
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

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
          response_schema: RESPONSE_SCHEMA,
          // gemini-2.5-flash is a "thinking" model by default; disable to
          // free the full output budget for the actual response and cut
          // latency from ~10s to ~2-3s.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Gemini API error (${response.status}): ${errBody}`);
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
