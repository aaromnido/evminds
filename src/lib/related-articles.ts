/**
 * Related-articles relevance heuristic (A9, 2026-07-15 SEO/stats meeting).
 *
 * `articles` (scraped news) has no `tags` column — only the site's own `posts`
 * table does (see the scoring in articulo/[slug].astro). Adding one now would
 * repeat the "AI field only applies going forward, leaves a backfill debt"
 * problem already tracked for `seo_title` (A11), so until the data shows this
 * heuristic isn't good enough, related news are scored by keyword overlap
 * extracted from title/seo_title instead of a real tags column.
 */

const STOPWORDS = new Set([
  // Spanish function words (3+ chars; shorter ones are dropped by MIN_TOKEN_LENGTH)
  "los",
  "las",
  "del",
  "con",
  "por",
  "para",
  "sus",
  "sin",
  "que",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "esos",
  "esas",
  "como",
  "mas",
  "pero",
  "desde",
  "hasta",
  "entre",
  "sobre",
  "tambien",
  "solo",
  "todo",
  "toda",
  "todos",
  "todas",
  "otro",
  "otra",
  "otros",
  "otras",
  "cada",
  "tras",
  "ante",
  "bajo",
  "segun",
  "cuando",
  "donde",
  "mientras",
  "aunque",
  "porque",
  "una",
  "unos",
  "unas",
  // Generic EV vocabulary — present in nearly every article, so it adds no
  // signal to tell related pieces apart from unrelated same-category noise.
  "electrico",
  "electrica",
  "electricos",
  "electricas",
  "coche",
  "coches",
  "vehiculo",
  "vehiculos",
  "nuevo",
  "nueva",
  "nuevos",
  "nuevas",
  "modelo",
  "modelos",
  "marca",
  "marcas",
  "precio",
  "precios",
  "bateria",
  "baterias",
  "autonomia",
  "carga",
  "mercado",
  "espana",
  "lanza",
  "lanzamiento",
  "global",
  "presenta",
  "confirma",
  "anuncia",
  "llega",
  "llegada",
  // Generic time words — high-frequency across unrelated articles (e.g. "el
  // mes pasado", "este año"), confirmed as a false-positive source in manual
  // QA for A9 (an unrelated "mes" match outranked a genuinely unrelated pick).
  "ano",
  "anos",
  "mes",
  "meses",
  "dia",
  "dias",
  "hoy",
  "ahora",
  "trimestre",
  // Generic quantity/testing words — near-universal across EV headlines
  // (any story can cite "miles de kilómetros" or a "prueba"), confirmed
  // during A9 manual QA: "miles" + "pruebas" tied a battery-degradation
  // article with genuine self-driving picks in an unrelated article's
  // related section.
  "miles",
  "millones",
  "cientos",
  "decenas",
  "pruebas",
  "prueba",
  // Thousands-separator artifact: "100.000€" / "1.000 unidades" split into
  // "100"/"1" + "000" — the trailing "000" fragment is never itself a model
  // number, but it matches almost every price/quantity headline. Confirmed
  // during A9 manual QA: it flooded the keyword candidate pool and crowded
  // out a genuine "robots"/"iron" match within the query LIMIT.
  "000",
  // English — some sources are EN (flagged via FlagEN)
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "new",
  "electric",
  "car",
  "cars",
  "vehicle",
  "vehicles",
  "price",
  "launch",
  "launches",
  "reveals",
  "announces",
  "its",
  "are",
  "has",
  "have",
  "will",
  "into",
  "your",
  "you",
]);

const MIN_TOKEN_LENGTH = 3;

/**
 * Recurring story clusters whose articles use different words for the same
 * topic (e.g. "Autopilot", "FSD", "Waymo" and "conducción autónoma" are all
 * self-driving coverage but share no literal token) — confirmed as a real gap
 * during A9 manual QA: an article about self-driving cars surfaced generic
 * same-category noise instead of the site's substantial Waymo/Autopilot/FSD
 * cluster. Whenever any term in a group is present, its canonical tag is
 * added to the extracted keywords so those articles score as related. Extend
 * this list as new recurring clusters surface.
 */
const TOPIC_CLUSTERS: { tag: string; terms: string[] }[] = [
  {
    tag: "topic:conduccion-autonoma",
    terms: [
      "autonomo",
      "autonoma",
      "autonomos",
      "autonomas",
      "autopilot",
      "self-driving",
      "self driving",
      "selfdriving",
      "robotaxi",
      "robotaxis",
      "waymo",
      "fsd",
      "cybercab",
    ],
  },
  {
    tag: "topic:robots-humanoides",
    terms: [
      "iron",
      "optimus",
      "humanoide",
      "humanoides",
      "robot humanoide",
      "robots humanoides",
      "unitree",
      "atlas",
      "tesla bot",
    ],
  },
  {
    // Manufacturer crisis coverage (layoffs, plant closures, restructuring) —
    // recurs across many different brands, so it needs the same synonym-fold
    // as the other clusters above. Deliberately narrow phrases, not bare
    // words like "recorte" or "pérdidas": those are ambiguous (a price cut,
    // or a battery range/autonomy loss, are unrelated stories that happen to
    // share the same noun).
    tag: "topic:crisis-fabricante",
    terms: [
      "reestructuracion",
      "reorganizacion ejecutiva",
      "despido",
      "despidos",
      "cierre de planta",
      "cierre de fabrica",
      "recorte de empleos",
      "recorte de personal",
      "recorte de plantilla",
      "ajuste de plantilla",
    ],
  },
  {
    // Battery degradation / longevity studies — Spanish sources say
    // "degradación", English sources say "degradation"; different literal
    // tokens for the same recurring editorial angle (real-world range
    // retention, lab cycle-life tests).
    tag: "topic:degradacion-bateria",
    terms: ["degradacion", "degradation", "ciclos de carga"],
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary containment check — plain substring matching would let a
 *  short term like "iron" false-positive inside an unrelated word (e.g.
 *  "Girona"), confirmed during A9 manual QA. */
function containsTerm(normalizedText: string, term: string): boolean {
  return new RegExp(`\\b${escapeRegExp(term)}\\b`).test(normalizedText);
}

/** Bare 4-digit years (e.g. "2027") are near-universal noise in EV headlines
 *  about future launches — confirmed during A9 manual QA as a false-positive
 *  source that outranked a genuine keyword match. Unlike model trim numbers
 *  ("L03"), a lone year carries no topical signal. */
const YEAR_TOKEN = /^(19|20)\d{2}$/;

/**
 * Extract meaningful keyword tokens (brand/model names, trims, numbers) from
 * one or more text fragments, filtering stopwords and generic EV vocabulary.
 * Accent- and case-insensitive; returns deduplicated lowercase tokens.
 */
export function extractKeywords(...texts: Array<string | null | undefined>): string[] {
  const normalized = texts
    .filter((t): t is string => Boolean(t))
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .filter(
      (token) =>
        token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token) && !YEAR_TOKEN.test(token),
    );

  const topicTags = TOPIC_CLUSTERS.filter((cluster) =>
    cluster.terms.some((term) => containsTerm(normalized, term)),
  ).map((cluster) => cluster.tag);

  return Array.from(new Set([...tokens, ...topicTags]));
}

/**
 * Literal, DB-searchable terms for the candidate-recall query. A `topic:*`
 * tag from extractKeywords() isn't itself text any article contains — it
 * only helps score candidates already in the pool. To actually pull in a
 * sibling that uses different vocabulary for the same cluster (e.g. an
 * article that only says "Waymo" when the current one only says
 * "autónomo"), expand a matched tag back into that cluster's full term list.
 *
 * Cluster terms are returned first: callers cap how many terms they query
 * (each is its own DB round trip), and a curated cluster term is a stronger,
 * more specific signal than an arbitrary title word — it should win that cap,
 * not get silently dropped behind it.
 */
export function searchTermsFor(keywords: string[]): string[] {
  const clusterTerms = new Set<string>();
  const plainTerms = new Set<string>();
  for (const keyword of keywords) {
    if (keyword.startsWith("topic:")) {
      const cluster = TOPIC_CLUSTERS.find((c) => c.tag === keyword);
      cluster?.terms.forEach((term) => clusterTerms.add(term));
    } else {
      plainTerms.add(keyword);
    }
  }
  const ordered = [...clusterTerms, ...plainTerms];
  // Drop a term that's just a plural/variant containing a shorter term
  // already in the set (e.g. "autonomos" ⊃ "autonomo", "robotaxis" ⊃
  // "robotaxi") — an ILIKE substring search for the shorter one already
  // matches the longer one, so keeping both would waste a query slot.
  return ordered.filter(
    (term) =>
      !ordered.some(
        (other) => other !== term && term.includes(other) && other.length < term.length,
      ),
  );
}

/**
 * Relevance score for a related-article candidate: keyword overlap outweighs
 * a same-category match, mirroring the shape of the own-content scoring in
 * articulo/[slug].astro (sharedTags * 2 + sameCategory).
 */
export function relatedArticleScore(
  candidateKeywords: string[],
  currentKeywords: Set<string>,
  sameCategory: boolean,
): number {
  const sharedKeywords = candidateKeywords.filter((keyword) => currentKeywords.has(keyword)).length;
  return sharedKeywords * 2 + (sameCategory ? 1 : 0);
}
