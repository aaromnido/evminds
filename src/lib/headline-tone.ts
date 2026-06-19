/**
 * Canonical definitions and scoring for the headline-tone feature (A12,
 * "Medios de Confianza").
 *
 * The scrape-time Gemini call CLASSIFIES each article's original headline into
 * one of three traffic-light buckets (stored in `articles.headline_tone`). This
 * module owns everything the app derives from those raw labels:
 *   - the per-article indicator copy/colors (mirror of src/lib/ai-warnings.ts),
 *   - the per-source score (plain arithmetic — never graded by the AI),
 *   - the time-window math for the public ranking,
 *   - the symbolic annual award selection.
 *
 * Mirror of the `HeadlineTone` union duplicated in the Edge Function
 * (supabase/functions/scrape/services/ai-summary.ts); keep both in sync.
 */

export type HeadlineTone = "green" | "amber" | "red";

interface ToneCopy {
  es: string;
  en: string;
}

interface ToneDefinition {
  /** Short label for the legend / tooltip. */
  label: ToneCopy;
  /** One-line explanation of what the color means. */
  description: ToneCopy;
  /** CSS custom property holding the fill color (defined in global.css). */
  colorVar: string;
}

export const TONE_DEFINITIONS: Record<HeadlineTone, ToneDefinition> = {
  green: {
    label: { es: "Titular honesto", en: "Honest headline" },
    description: {
      es: "El titular describe la noticia con fidelidad, sin cebo.",
      en: "The headline describes the story faithfully, no bait.",
    },
    colorVar: "--ev-tone-green",
  },
  amber: {
    label: { es: "Titular hot", en: "Hot headline" },
    description: {
      es: "El titular tiene algo de gancho, pero no engaña ni oculta el dato clave.",
      en: "The headline has a mild hook but doesn't mislead or hide the key fact.",
    },
    colorVar: "--ev-tone-amber",
  },
  red: {
    label: { es: "Titular clickbait", en: "Clickbait headline" },
    description: {
      es: "El titular promete más de lo que cuenta la noticia.",
      en: "The headline promises more than the story delivers.",
    },
    colorVar: "--ev-tone-red",
  },
};

/** Copy + color for the "not yet classified" state (⚪ white fill). */
export const TONE_UNCLASSIFIED = {
  label: { es: "Sin clasificar", en: "Not classified" },
  description: {
    es: "Este titular aún no se ha clasificado.",
    en: "This headline hasn't been classified yet.",
  },
  colorVar: "--ev-tone-empty",
} as const;

function isEnglish(lang: string): boolean {
  return lang.toLowerCase().startsWith("en");
}

/** Resolves the short label for an article's tone (null → "Sin clasificar"). */
export function resolveToneLabel(tone: HeadlineTone | null, lang = "es"): string {
  const def = tone ? TONE_DEFINITIONS[tone] : TONE_UNCLASSIFIED;
  return def.label[isEnglish(lang) ? "en" : "es"];
}

/** Resolves the one-line description for an article's tone. */
export function resolveToneDescription(tone: HeadlineTone | null, lang = "es"): string {
  const def = tone ? TONE_DEFINITIONS[tone] : TONE_UNCLASSIFIED;
  return def.description[isEnglish(lang) ? "en" : "es"];
}

/** CSS custom property holding the fill color for a tone (null → empty). */
export function resolveToneColorVar(tone: HeadlineTone | null): string {
  return (tone ? TONE_DEFINITIONS[tone] : TONE_UNCLASSIFIED).colorVar;
}

// ── Per-source ranking ──────────────────────────────────────────────────────

/** Selectable windows for the public ranking. "year" honours the annual reset. */
export type TimeWindow = "24h" | "week" | "month" | "year";

export const TIME_WINDOWS: { key: TimeWindow; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "year", label: "Anual" },
];

/** Default view: matches the annual award headline. */
export const DEFAULT_WINDOW: TimeWindow = "year";

/** Minimum classified articles in the window before a source gets a color (⚪ below). */
export const MIN_SAMPLE = 8;

/** Validates a raw query-string value into a TimeWindow, falling back to default. */
export function parseWindow(value: string | null | undefined): TimeWindow {
  return TIME_WINDOWS.some((w) => w.key === value) ? (value as TimeWindow) : DEFAULT_WINDOW;
}

/**
 * Lower bound (ISO) for `source_headline_ranking(p_since)`.
 * Rolling for 24h/week/month; "year" snaps to Jan 1 of the current year so the
 * ranking resets each January (the "right to redemption" rule).
 */
export function windowToSince(window: TimeWindow, now: Date = new Date()): string {
  if (window === "year") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString();
  }
  const since = new Date(now);
  if (window === "24h") since.setUTCHours(since.getUTCHours() - 24);
  else if (window === "week") since.setUTCDate(since.getUTCDate() - 7);
  else if (window === "month") since.setUTCDate(since.getUTCDate() - 30);
  return since.toISOString();
}

/** One row returned by the `source_headline_ranking` RPC. */
export interface SourceToneCounts {
  source_id: string;
  source_name: string;
  n_green: number;
  n_amber: number;
  n_red: number;
  n_total: number;
}

export interface RankedSource {
  sourceId: string;
  sourceName: string;
  counts: { green: number; amber: number; red: number; total: number };
  /** Weighted mean in [0..2] (green=0, amber=1, red=2). Lower = more trustworthy. null below MIN_SAMPLE. */
  score: number | null;
  /** Overall traffic-light color. null = ⚪ not enough data. */
  color: HeadlineTone | null;
  enoughSample: boolean;
}

/**
 * Per-source score: weighted mean of the tone labels (green=0, amber=1, red=2).
 * Plain arithmetic computed by us — the AI never grades the source.
 */
export function scoreFromCounts(c: SourceToneCounts): number {
  const total = Number(c.n_total) || 0;
  if (total <= 0) return 0;
  return (Number(c.n_amber) * 1 + Number(c.n_red) * 2) / total;
}

/** Maps a weighted-mean score back to a traffic-light color. */
export function colorFromScore(score: number): HeadlineTone {
  if (score <= 0.5) return "green";
  if (score <= 1.2) return "amber";
  return "red";
}

/**
 * Turns raw RPC counts into ranked sources, most trustworthy first.
 * Sources below MIN_SAMPLE keep a null score/color (⚪) and sort last (by volume).
 */
export function rankSources(rows: SourceToneCounts[]): RankedSource[] {
  return rows
    .map((r): RankedSource => {
      const total = Number(r.n_total) || 0;
      const enoughSample = total >= MIN_SAMPLE;
      const score = enoughSample ? scoreFromCounts(r) : null;
      return {
        sourceId: r.source_id,
        sourceName: r.source_name,
        counts: {
          green: Number(r.n_green) || 0,
          amber: Number(r.n_amber) || 0,
          red: Number(r.n_red) || 0,
          total,
        },
        score,
        color: score === null ? null : colorFromScore(score),
        enoughSample,
      };
    })
    .sort((a, b) => {
      if (a.score === null && b.score === null) return b.counts.total - a.counts.total;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return a.score - b.score;
    });
}

/**
 * Picks the symbolic award winner: the most trustworthy source with enough
 * sample. Returns null when no source qualifies (e.g. early days, all below
 * the minimum). The page decides how prominently to celebrate it.
 */
export function awardWinner(ranked: RankedSource[]): RankedSource | null {
  return ranked.find((r) => r.enoughSample) ?? null;
}
