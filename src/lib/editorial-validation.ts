/**
 * Client-side validation for the editorial brief (task A3, step ②).
 *
 * Kept apart from the components on purpose: this is the stable, non-visual half
 * of the screen — the shape of the UI keeps changing between iterations, these
 * rules do not. It is also the part worth covering with tests once the UI phase
 * closes (same reasoning as `editorial-utils.ts`).
 *
 * Messages are user-facing, so they are in Spanish and they say what to do, not
 * what went wrong.
 */

/** Below this a headline is too vague to steer anything. */
export const TITLE_MIN = 15;
/** Below this the angle is not an instruction, it is a wish. */
export const ANGLE_MIN = 30;

/** Google truncates a headline around here, so it is what step ② aims at. */
export const SEO_TITLE_MAX = 60;

/**
 * Motor.es' own recommended lengths, taken verbatim from their CMS help text
 * (screenshot, 2026-07-26) rather than from the mapping document, which guessed
 * bands (50–65, 135–155) their form does not state.
 *
 * They are **single recommended targets**, which is why the counters warn past
 * the number instead of shading a range: "Recomendables 65", "Recomendables 155",
 * "Recomendadas entre 40 y 45 palabras. 50 Máximo".
 */
export const CMS_TITLE_MAX = 65;
export const CMS_META_DESCRIPTION_MAX = 155;
/** Counted in **words**, unlike every other field on the screen. */
export const CMS_LEAD_WORDS_MAX = 50;
/** "Recomendado entre 2 y 5 como máximo." */
export const CMS_TAGS_MAX = 5;

export interface BriefErrors {
  title: string | null;
  angle: string | null;
}

/** True when nothing blocks moving on. */
export function isBriefValid(errors: BriefErrors): boolean {
  return !errors.title && !errors.angle;
}

/** A draft shorter than this is not a piece, it is a note. */
export const BODY_MIN = 200;

/**
 * Below this an excerpt is not a summary, and it is also the text that ends up
 * as the article's meta description and card teaser — where too short simply
 * gets no clicks.
 */
export const EXCERPT_MIN = 80;

export interface ChannelDraftErrors {
  title: string | null;
  body: string | null;
  image: string | null;
  schedule: string | null;
  /** The `posts`-only fields. Always null on a channel we don't host. */
  slug: string | null;
  excerpt: string | null;
  imageAlt: string | null;
  /** The other CMS's required fields. Always null on a channel we host. */
  lead: string | null;
}

export interface ChannelDraftInput {
  title: string;
  body: string;
  imageUrl: string;
  /** `YYYY-MM-DD`. The hour is no longer asked for — see `ScheduleField`. */
  publishDate: string;
  /**
   * Set only on a channel whose finish line creates a `posts` row (EVminds).
   * Its absence is how the input says "this channel has no article record",
   * which reads better than a boolean flag beside optional fields.
   */
  postRecord?: {
    slug: string;
    excerpt: string;
    imageAlt: string;
  };
  /**
   * Set only on a channel transcribed into someone else's CMS (Motor.es). Same
   * presence-activates-the-rules shape as `postRecord`.
   *
   * **Only the entradilla is in here, and that is deliberate.** Motor.es marks
   * exactly two fields required in their form, `Título` and `Entradilla`, and the
   * rest — meta title, meta description, marca, modelo, fuente, tags — are
   * optional there. Requiring any of them here would invent a rule their own CMS
   * does not have, and would block the button over a field Fer is allowed to
   * leave empty. Same reasoning that keeps category and tags out of `postRecord`.
   */
  cmsRecord?: {
    lead: string;
  };
}

/**
 * What a piece needs before it can leave the panel.
 *
 * The hero image is required on both channels (requirement R2), so the step
 * cannot be closed without one and the reason is said out loud instead of
 * showing up as an error after the click.
 *
 * The date is **always required**, on both channels (Fer, 2026-07-26) — even
 * Motor.es, where it is a prediction rather than a commitment, needs one filled
 * in so the two channels' dates can be lined up. The **time** is no longer asked
 * for at all: Motor.es' system decides it and ours is fixed at 8:00 Madrid.
 *
 * `postRecord` adds the fields `posts` needs and Motor.es does not: the URL, the
 * excerpt and the image's alt text. Category and tags are absent on purpose —
 * the category always has a valid default, and tags are optional in `posts`
 * today, so requiring either here would invent a rule Artículos does not have.
 */
export function validateChannelDraft(input: ChannelDraftInput): ChannelDraftErrors {
  const body = input.body.trim();
  const record = input.postRecord;
  const excerpt = record?.excerpt.trim() ?? "";

  return {
    slug: !record
      ? null
      : record.slug.trim()
        ? null
        : "La URL del artículo no puede quedarse vacía.",
    excerpt: !record
      ? null
      : !excerpt
        ? "Escribe un extracto: es lo que se lee en las tarjetas y en Google."
        : excerpt.length < EXCERPT_MIN
          ? `Demasiado corto para resumir la pieza: al menos ${EXCERPT_MIN} caracteres.`
          : null,
    // Required here even though Artículos leaves it optional: this is the piece's
    // hero image, the alt text is what a screen reader and Google get instead of
    // it, and nobody writes it unless they are asked.
    imageAlt: !record
      ? null
      : record.imageAlt.trim()
        ? null
        : "Describe la imagen en una frase, para quien no puede verla.",
    // The lead is `Entradilla` in Motor.es' form, one of only two fields they
    // mark required. It is a separate field from the body on purpose: their
    // template prints it above the article, and the body must not repeat it.
    lead: !input.cmsRecord
      ? null
      : input.cmsRecord.lead.trim()
        ? null
        : "Escribe la entradilla: es el párrafo con el que abre la pieza en Motor.es.",
    title: input.title.trim() ? null : "El titular no puede quedarse vacío.",
    body: !body
      ? "No hay texto que publicar."
      : body.length < BODY_MIN
        ? "El texto se ha quedado demasiado corto. Revísalo antes de darlo por bueno."
        : null,
    image: input.imageUrl.trim() ? null : "Hace falta una imagen de cabecera para publicar.",
    schedule: input.publishDate ? null : "Elige el día de publicación.",
  };
}

/**
 * Whether scheduling for this day would not actually schedule anything.
 *
 * With a fixed publishing hour, picking **today** once that hour has passed means
 * "publish in the past", which any sane backend turns into "publish now". That is
 * a real surprise on the one screen whose entire promise is *programar*, so it is
 * said out loud — as a warning, never as a block: publishing immediately is a
 * legitimate thing to want, just not something to get by accident.
 *
 * Everything here is **string comparison on wall-clock values**, deliberately. The
 * two "now" values come from the page, already expressed in Madrid time (see
 * `texto.astro`), so no `Date` is parsed, no timezone shifts, and the result is
 * identical on the server and after hydration.
 */
export function isPublishDatePast(
  publishDate: string,
  publishHour: string | undefined,
  todayLocal: string,
  nowHourLocal: string,
): boolean {
  if (!publishDate || !publishHour) return false;
  if (publishDate < todayLocal) return true;
  return publishDate === todayLocal && nowHourLocal >= publishHour;
}

export function isChannelDraftValid(errors: ChannelDraftErrors): boolean {
  return Object.values(errors).every((error) => !error);
}

/**
 * Both fields are required: without a headline and an angle the redactor has
 * nothing to aim at, and it would invent the piece rather than write yours.
 */
export function validateBrief(title: string, angle: string): BriefErrors {
  const t = title.trim();
  const a = angle.trim();

  return {
    title: !t
      ? "Ponle un titular, aunque sea provisional."
      : t.length < TITLE_MIN
        ? `Demasiado corto para orientar al redactor: al menos ${TITLE_MIN} caracteres.`
        : null,
    angle: !a
      ? "Cuenta qué quieres contar, aunque sea en una frase."
      : a.length < ANGLE_MIN
        ? `Con tan poco, el enfoque se lo inventa la IA. Escribe al menos una frase (${ANGLE_MIN} caracteres).`
        : null,
  };
}
