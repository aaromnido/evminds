/**
 * Service: AI-generated article summary + transparency warnings
 *
 * Calls Gemini Flash 2.0 with the article title and excerpt, expecting a
 * structured JSON response with `summary` and `warnings`. On any failure
 * path returns {summary: null, warnings: []} so the surrounding scraper
 * inserts the article without AI fields rather than aborting the row.
 */

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

// Headline sensationalism, traffic-light style. Mirror of the canonical type in
// src/lib/headline-tone.ts (the Edge Function can't import the frontend tree).
// The AI only CLASSIFIES into one bucket; the per-source score is computed in
// the app, never by the model.
export type HeadlineTone = 'green' | 'amber' | 'red';

// Powertrain classification used by the BEV-only filter (Fase 2). Values map
// directly to the Gemini response enum; 'na' means the article is not about
// any specific powertrain (infrastructure, policy, etc.).
export type Powertrain = 'bev' | 'phev' | 'erev' | 'hev' | 'ice' | 'na';

export interface SummaryResult {
  summary: string | null;
  warnings: SummaryWarning[];
  /** Soft 1-2 sentence invitation to comment, tied to the article's key debate. */
  discussionPrompt?: string;
  /** SEO-optimized headline (brand+model first, ≤75 chars). Feeds <title>/og:title/<h1>. */
  seoTitle?: string;
  /** Spanish translation of the original title — only set when source.lang !== 'es' */
  translatedTitle?: string;
  /** Spanish translation of the original excerpt — only set when source.lang !== 'es' */
  translatedExcerpt?: string;
  /** Traffic-light sensationalism of the ORIGINAL headline (green/amber/red). */
  headlineTone?: HeadlineTone;
  /** Powertrain classification for BEV-only filter. Undefined on validation failure (fail-open). */
  powertrain?: Powertrain;
}

const VALID_WARNING_TYPES: ReadonlySet<WarningType> = new Set<WarningType>([
  'price_non_european',
  'price_subsidized',
  'autonomy_cltc',
  'autonomy_wltp_no_real',
  'launch_non_european',
  'prototype_as_product',
]);

const VALID_HEADLINE_TONES: ReadonlySet<HeadlineTone> = new Set<HeadlineTone>([
  'green',
  'amber',
  'red',
]);

export const VALID_POWERTRAINS: ReadonlySet<Powertrain> = new Set<Powertrain>([
  'bev',
  'phev',
  'erev',
  'hev',
  'ice',
  'na',
]);

const EMPTY: SummaryResult = { summary: null, warnings: [] };

const MAX_ATTEMPTS = 5;
const RETRYABLE_STATUS = new Set([429, 503]);
// Linear backoff between attempts: 500ms, 1s, 1.5s, 2s (total worst case ~5s).
const RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Single source of truth for the SEO-title style. Used both by the bundled
// prompt (buildPrompt) and the standalone generator (generateSeoTitle / the
// admin "Generar con IA" button), so the editorial line stays identical.
const SEO_TITLE_RULES = `Genera un "seo_title": un titular optimizado para SEO en español de España, pensado para el <title>, el og:title y el <h1> visible de la noticia.

Reglas OBLIGATORIAS:
- Longitud: APROVECHA el espacio, apunta a 65-75 caracteres (MÁXIMO ABSOLUTO 75). NO te quedes en titulares telegráficos de ~60 si tienes información útil que añadir (el porqué, el matiz, un dato). Coloca lo esencial (marca + modelo + ángulo principal) en los primeros 60, porque Google solo muestra ~60 en el resultado de búsqueda, y usa el resto hasta 75 para el contexto honesto que ayude al lector a decidir si la noticia le interesa. Una sola línea. Sin Markdown, sin comillas, sin guiones largos (—): separa con comas.
- EMPIEZA por la marca + el modelo del vehículo, separados del resto por una COMA (ej. "Luxeed RX, el sedán de Huawei", "MG2 2027, el eléctrico barato"). Es lo que busca la gente. Si la noticia NO trata de un modelo concreto (una tecnología, un mercado, una empresa, una persona), empieza por el sujeto principal de búsqueda (la marca, la tecnología o el tema).
- Al referirte al vehículo en genérico, usa el MASCULINO: "el eléctrico", "el híbrido", "el SUV" (nunca "la eléctrica" / "la híbrida").
- Trato al lector: TUTEA, nunca uses el "usted" formal. Cuando el titular se dirija a la persona que lee, usa "tú", "tu", "te", "tuyo" (cercanía). IMPORTANTE: no confundas esto con el posesivo de tercera persona: cuando "su" se refiere a una marca o empresa (ej. "Rivian no decide cuál será su próximo eléctrico"), es correcto y se mantiene, NO lo cambies a "tu".
- Titular HONESTO, CERO clickbait. Describe lo que el artículo dice de verdad. Nada de cebo, hype, "no te creerás", incógnitas artificiales ni promesas exageradas. Si el titular original de la fuente es cebo, recondúcelo a algo informativo conservando el ángulo real.
- Conserva el HECHO NOTICIOSO concreto (quién hace qué: un tribunal falla, una agencia multa, una marca retira o lanza, alguien bate un récord). No te quedes solo con la conclusión o el ángulo si al hacerlo pierdes el evento que convierte esto en noticia. Y ATRIBUYE las afirmaciones de terceros ("un tribunal belga tumba su carga ultrarrápida") en vez de afirmarlas como hechos propios ("la carga ultrarrápida es engañosa").
- Incluye el MOTIVO o causa cuando sea relevante (el porqué de la noticia). No basta con "un tribunal tumba su carga rápida"; si la fuente lo dice, añade el motivo: "un tribunal tumba su carga rápida por engañosa". El "por qué" suele ser lo que más ayuda al lector a decidir si le interesa.
- Ciclo de autonomía: si el titular incluye una cifra de autonomía 100% eléctrica, etiqueta el ciclo de homologación según el mercado: "X km WLTP" para coches de mercado europeo, "X km CLTC" para mercado chino (es la homologación legal de cada mercado, no es inventar). Si la cifra es de un híbrido enchufable (autonomía combinada, no eléctrica pura), usa "autonomía combinada" y NO pongas ciclo.
- Coletilla de mercado — SOLO si el título o el extracto originales lo respaldan de forma LITERAL (la misma regla que los warnings: NO lo infieras por la marca, la geografía del fabricante ni el contexto general):
  · Si dice literalmente que llega / se vende / aún no en España o Europa → coletilla tipo "llega a España", "a la venta en España", "aún no en España".
  · Si el lanzamiento, la venta o el precio son exclusivos de un mercado no europeo (China, USA, Hong Kong, Asia), o aplicaría el warning launch_non_european → NOMBRA el mercado real: "de momento solo en China", "solo en China", "solo en EE.UU.".
  · Si el texto NO menciona mercado → SIN coletilla: solo marca + modelo + el ángulo real.
- La honestidad manda sobre el patrón: si una coletilla no cabe en el límite o suena forzada, déjala fuera; nunca recortes la honestidad del ángulo para meter una coletilla.
- Moneda: usa SIEMPRE el símbolo real (€, $), nunca la palabra ni una entidad. Dólares con el símbolo DELANTE y pegado a la cifra ("$600"); euros con el símbolo DETRÁS y pegado, sin espacio ("50.000€").

Ejemplos correctos:
- "MG2 2027, el eléctrico barato que llega a España"
- "BYD Da Tang, 950 km CLTC, de momento solo en China"
- "BMW i3, 469 CV y 900 km WLTP, reservas ya"
- "Elon Musk cobra 116.000 millones de dólares de Tesla"
Ejemplos INCORRECTOS:
- "No te creerás la autonomía de este coche" (clickbait)
- "Un SUV con 640 km por 18.000 €" (oculta que es solo China)`;

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

  const sharedBody = `1. Un "summary" que es un array JSON de exactamente 5 strings, un string por párrafo. Cada string es un párrafo de 2-3 frases en español de España. Es una síntesis editorial, NO un copy-paste del extracto. Tono periodístico, neutro, informativo.

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

  const seoTitleSection = `

4. ${SEO_TITLE_RULES}`;

  const headlineToneSection = `

5. Un "headline_tone": clasifica el TITULAR ORIGINAL de la fuente (el título de arriba, ${isEnglish ? 'en inglés, tal cual, ANTES de traducirlo' : 'tal cual'}) en uno de tres niveles según el HUECO entre lo que el titular PROMETE y lo que el contenido (extracto/resumen) ENTREGA de verdad. Devuelve SOLO una de estas tres cadenas exactas:
- "green": titular sobrio y honesto. Describe el hecho real sin cebo; titular y contenido coinciden. Ej.: "El Volkswagen ID.3 recibe una actualización que mejora la velocidad de carga".
- "amber": gancho leve. Hay algo de intriga, un adjetivo llamativo o una pregunta retórica, pero NO engaña ni oculta el dato clave. Ej.: "El nuevo MG llega para poner en jaque a los eléctricos baratos".
- "red": clickbait. Promete más de lo que cuenta, oculta el dato esencial para forzar el clic, exagera, usa incógnitas artificiales, o titula con algo que el contenido no sostiene. Ej.: "No te vas a creer la autonomía de este coche", "Este eléctrico va a cambiar el mercado para siempre".

Reglas del headline_tone:
- Clasifica el titular ORIGINAL, NO el seo_title que tú generas ni una versión mejorada.
- Juzga SOLO el sensacionalismo (honestidad titular-vs-contenido), no si la noticia es importante ni si el coche es bueno.
- En la duda entre dos niveles, elige el MENOS severo: nadie debe acabar en rojo por azar.`;

  const powertrainSection = `

6. Un "powertrain": clasifica el powertrain del vehículo protagonista de la noticia. Devuelve SOLO una de estas cadenas exactas:
- "bev": batería, eléctrico puro. Es el único powertrain que PUBLICAMOS.
- "phev": híbrido enchufable (plug-in hybrid).
- "erev": extended range electric vehicle (Range Extender, electricidad + motor de combustión como generador).
- "hev": híbrido no enchufable (microhíbrido, mild hybrid, híbrido convencional).
- "ice": combustión interna, diésel, gasolina, gas, e-fuel, combustible sintético.
- "na": el powertrain NO es el tema de la noticia (infraestructura de carga, política energética, empresa sin un vehículo protagonista, legislación, mercado general).

REGLAS DE CLASIFICACIÓN:
a) Clasifica según el ENFOQUE PRINCIPAL de la noticia, no según apariciones secundarias.
b) "na" SOLO cuando el powertrain no es el tema: infraestructura, carga, política, empresa sin vehículo protagonista, legislación, mercado general. Si la noticia va DE híbridos, PHEV o vehículos de combustión aunque sea sectorial o de industria ("las ventas de PHEV crecen un 40%", un recall de híbridos, un comparativo de híbridos enchufables), clasifica "phev" o "hev". Coherente con la decisión editorial de no publicar noticias de industria sobre powertrains no-BEV.
c) EXCEPCIÓN a la regla anti-alucinaciones: para este campo SOLO, usa tu conocimiento del modelo. Aunque el texto no mencione el powertrain, si conoces el vehículo por su nombre y modelo (ej. Xpeng G6, Denza Bao 5, BYD Seal, Tesla Model 3), clasifícalo con tu conocimiento. Esta exención es intencional y SOLO aplica a este campo.
d) Desempate conservador: si el modelo existe en variante BEV y no-BEV (BYD Seal U DM-i/EV, Leapmotor C10 BEV/REEV, Deepal S07, etc.) y el texto no aclara cuál es, clasifica "bev" o "na"; NUNCA descartes por duda. Las dudas se resuelven siempre a favor de publicar.`;

  const translationSections = isEnglish
    ? `

7. Un "translated_title": traducción al español de España del título original. Periodística, natural, NO literal. Preserva el sentido y el matiz. Sin negritas, sin Markdown.

8. Un "translated_excerpt": traducción al español de España del extracto original. Mismo tono que el del original. Sin negritas, sin Markdown.`
    : '';

  const outputExample = isEnglish
    ? `{"summary": ["Párrafo 1...", "Párrafo 2...", "Párrafo 3...", "Párrafo 4...", "Párrafo 5..."], "warnings": [{"type": "autonomy_cltc"}], "discussion_prompt": "...", "seo_title": "...", "headline_tone": "amber", "powertrain": "bev", "translated_title": "...", "translated_excerpt": "..."}`
    : `{"summary": ["Párrafo 1...", "Párrafo 2...", "Párrafo 3...", "Párrafo 4...", "Párrafo 5..."], "warnings": [{"type": "autonomy_cltc"}, {"type": "launch_non_european"}], "discussion_prompt": "...", "seo_title": "...", "headline_tone": "green", "powertrain": "bev"}`;

  const inputBlock = isEnglish
    ? `Título original (inglés): ${title}
Extracto original (inglés): ${excerpt}
URL fuente: ${articleUrl}`
    : `Título: ${title}
Extracto: ${excerpt}
URL fuente: ${articleUrl}`;

  return `${intro}

${sharedBody}${seoTitleSection}${headlineToneSection}${powertrainSection}${translationSections}

Formato de salida (ejemplo):
${outputExample}

${inputBlock}`;
}

function buildResponseSchema(isEnglish: boolean) {
  const properties: Record<string, unknown> = {
    summary: { type: 'ARRAY', items: { type: 'STRING' } },
    warnings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { type: { type: 'STRING' } },
        required: ['type'],
      },
    },
    discussion_prompt: { type: 'STRING' },
    seo_title: { type: 'STRING' },
    headline_tone: { type: 'STRING', enum: ['green', 'amber', 'red'] },
    powertrain: { type: 'STRING', enum: ['bev', 'phev', 'erev', 'hev', 'ice', 'na'] },
  };
  const required = ['summary', 'warnings', 'discussion_prompt', 'seo_title', 'headline_tone', 'powertrain'];

  // For non-Spanish sources, also require Spanish translations of title/excerpt
  // so the article can be stored in Spanish in the database.
  if (isEnglish) {
    properties.translated_title = { type: 'STRING' };
    properties.translated_excerpt = { type: 'STRING' };
    required.push('translated_title', 'translated_excerpt');
  }

  return { type: 'OBJECT', properties, required };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Converts Gemini's markdown summary (** bold **, \n\n paragraph breaks) to
// HTML <p> tags so both the Tiptap admin editor and the public page can render
// it without any client-side markdown parsing.
function summaryMarkdownToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0)
    .map((para) => {
      const safe = escapeHtml(para).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      return `<p>${safe}</p>`;
    })
    .join('\n');
}

// Normalizes currency notation to the evminds house style, deterministically
// (the model honors this only intermittently via the prompt):
//   USD → symbol BEFORE, glued: "600 $" / "$ 600" → "$600"
//   EUR → symbol AFTER, glued:  "€600" / "600 €"  → "600€"
export function normalizeCurrency(s: string): string {
  return s
    .replace(/(\d[\d.,]*)\s*\$/g, '$$$1') // "600 $" / "600$" → "$600"
    .replace(/\$\s+(?=\d)/g, '$$')        // "$ 600" → "$600"
    .replace(/€\s*(\d[\d.,]*)/g, '$1€')   // "€600" / "€ 600" → "600€"
    .replace(/(\d[\d.,]*)\s+€/g, '$1€');  // "600 €" → "600€"
}

// Extracts and trims the seo_title from a parsed Gemini object. Shared by the
// bundled path (parseAndValidate) and the standalone generateSeoTitle.
function parseSeoTitle(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.seo_title !== 'string') return null;
  const trimmed = normalizeCurrency(obj.seo_title).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseAndValidate(raw: unknown): SummaryResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  // summary may be an array of paragraph strings (new format) or a plain string (legacy).
  let summaryHtml: string;
  if (Array.isArray(obj.summary)) {
    const paras = (obj.summary as unknown[]).filter((s) => typeof s === 'string' && (s as string).trim().length > 0) as string[];
    if (paras.length === 0) return null;
    summaryHtml = summaryMarkdownToHtml(paras.map(normalizeCurrency).join('\n\n'));
  } else if (typeof obj.summary === 'string' && obj.summary.trim().length >= 20) {
    summaryHtml = summaryMarkdownToHtml(normalizeCurrency(obj.summary.trim()));
  } else {
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

  const result: SummaryResult = { summary: summaryHtml, warnings };
  if (typeof obj.discussion_prompt === 'string' && obj.discussion_prompt.trim()) {
    result.discussionPrompt = normalizeCurrency(obj.discussion_prompt.trim());
  }
  const seoTitle = parseSeoTitle(obj);
  if (seoTitle) result.seoTitle = seoTitle;
  if (typeof obj.headline_tone === 'string' && VALID_HEADLINE_TONES.has(obj.headline_tone as HeadlineTone)) {
    result.headlineTone = obj.headline_tone as HeadlineTone;
  }
  if (typeof obj.powertrain === 'string' && VALID_POWERTRAINS.has(obj.powertrain as Powertrain)) {
    result.powertrain = obj.powertrain as Powertrain;
  }
  if (typeof obj.translated_title === 'string' && obj.translated_title.trim()) {
    result.translatedTitle = normalizeCurrency(obj.translated_title.trim());
  }
  if (typeof obj.translated_excerpt === 'string' && obj.translated_excerpt.trim()) {
    result.translatedExcerpt = normalizeCurrency(obj.translated_excerpt.trim());
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

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
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

function buildSeoTitlePrompt(title: string, excerpt: string, lang: string): string {
  const isEnglish = lang.toLowerCase().startsWith('en');
  const inputBlock = isEnglish
    ? `Título original (inglés): ${title}
Extracto original (inglés): ${excerpt}`
    : `Título: ${title}
Extracto: ${excerpt}`;

  return `Eres un editor de noticias sobre vehículos eléctricos para el mercado español (ES-ES). A partir del título y el extracto de una noticia, genera ÚNICAMENTE un "seo_title" en español de España.

${SEO_TITLE_RULES}

Formato de salida (ejemplo):
{"seo_title": "..."}

${inputBlock}`;
}

/**
 * Standalone SEO-title generator for the admin "Generar con IA" button.
 * A focused, cheap Gemini call that returns ONLY the seo_title string, reusing
 * the same shared style rules as the bundled summary path. Always outputs ES-ES.
 * @returns the trimmed seo_title, or null on any failure.
 */
export async function generateSeoTitle(
  title: string,
  excerpt: string,
  lang: string,
): Promise<string | null> {
  if (!title || !excerpt) return null;

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY missing; skipping SEO title');
    return null;
  }

  const requestBody = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: buildSeoTitlePrompt(title, excerpt, lang) }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 256,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: { seo_title: { type: 'STRING' } },
        required: ['seo_title'],
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
      console.error('Gemini SEO title response missing text content:', JSON.stringify(data));
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Gemini SEO title response not valid JSON:', text);
      return null;
    }

    const seoTitle = parseSeoTitle(parsed);
    if (!seoTitle) {
      console.error('Gemini SEO title failed validation:', text);
      return null;
    }

    return seoTitle;
  } catch (error) {
    console.error('SEO title error:', error);
    return null;
  }
}
