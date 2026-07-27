/**
 * What each publishing destination is and how a finished piece leaves the panel
 * for it (task A3).
 *
 * One place for all of it, because the channel is named in three screens: the
 * picker in step ②, the wizard indicator, and the per-channel screen itself. Two
 * lists would drift the day a channel is renamed.
 */

import type { PublishChannel } from "./editorial-types";

/**
 * How the piece reaches the channel.
 *
 * - `copy` — it does not. The text is copied to the clipboard and pasted into
 *   someone else's CMS by hand, image included. Confirmed by Fer (2026-07-25):
 *   there is NO integration with Motor.es' API. We keep the backup copy, nothing
 *   more.
 * - `schedule` — we own the site, so the piece is scheduled from here.
 */
export type ChannelHandoff = "copy" | "schedule";

export interface ChannelSpec {
  value: PublishChannel;
  name: string;
  /** One line on what publishing there involves. Shown in the step ② picker. */
  description: string;
  handoff: ChannelHandoff;
  /**
   * Whether finishing this channel creates a row in our own `posts` table.
   *
   * Only true for EVminds, and it is what makes step ④ more than a clone of step
   * ③: `posts` needs a slug, an excerpt, a category, tags and an alt text that
   * handing a text over to someone else's CMS simply does not.
   */
  needsPostRecord?: boolean;
  /**
   * Whether this channel's piece is transcribed by hand into someone else's CMS,
   * and therefore carries that CMS's own columns.
   *
   * Only true for Motor.es. It is what turns step ③ from "text + image + date"
   * into a **reference sheet** for their form: their labels, their order, their
   * help text, and a copy button per field.
   *
   * It could have been derived from `handoff === "copy"`, but that would tie two
   * separate facts together — how the piece leaves and which fields it carries —
   * and a future third channel could easily be one without the other.
   */
  needsCmsFields?: boolean;
  /** Line under the text block's title, saying what this channel's text IS. */
  draftHint: string;
  /** Label and hint of the date field on that channel's screen. Always required. */
  dateLabel: string;
  dateHint: string;
  /**
   * The wall-clock hour the piece goes out at, `HH:MM`, where we control it.
   *
   * Set only for EVminds. Fer's call (2026-07-26): the panel stopped asking for a
   * time on either channel, because on Motor.es the hour is decided by their
   * system and on ours nobody writing an article has an opinion about the minute.
   * So it is fixed here instead of being one more required field with no real
   * answer. Absent on Motor.es, where the hour is genuinely not ours to know.
   */
  publishHour?: string;
  /** The screen's single primary action. */
  finalLabel: string;
  finalRunningLabel: string;
  /** What the completion state says once that action succeeded. */
  doneTitle: string;
  doneHint: string;
}

export const CHANNELS: ChannelSpec[] = [
  {
    value: "motor",
    name: "Motor.es",
    description: "Tu colaboración. Se genera el texto y lo copias a su CMS con la imagen.",
    handoff: "copy",
    needsCmsFields: true,
    draftHint:
      "Escrito con tu enfoque. Edítalo todo lo que quieras: lo que se copia es lo que ves aquí.",
    dateLabel: "Fecha",
    dateHint:
      "Su ritmo editorial no lo controlamos desde aquí, y la hora la pone su sistema. Apunta el día que esperas para cuadrar el tuyo, y cámbialo luego si se mueve.",
    // Fer, 2026-07-26: "Copiar el texto" stopped being true the moment the piece
    // started being copied field by field, and nothing on this screen publishes
    // anything. What the button does is bookkeeping — the piece is finished on
    // our side and the backup copy is kept — so that is what it says. The verb
    // is shared with "Guardar borrador" beside it, and "y terminar" is what
    // separates them: one keeps working, the other closes the piece.
    finalLabel: "Guardar y terminar",
    finalRunningLabel: "Guardando…",
    doneTitle: "Pieza terminada",
    // Fer, 2026-07-26: it has to be explicit that nothing has been published.
    // The previous wording described the steps ("pégalo, sube la imagen") but
    // left the state implicit, and the green check on top reads as "done".
    doneHint:
      "El artículo queda como borrador y solo se publicará si lo introduces en el CMS de Motor.es.",
  },
  {
    value: "evminds",
    name: "EVminds",
    description: "Tu propio sitio. Texto e imagen, y lo dejas programado desde aquí.",
    handoff: "schedule",
    needsPostRecord: true,
    // Fer, 2026-07-26: EVminds gets its OWN version, generated on arrival — not
    // the Motor.es text with a rewrite button. Two drafts from one pipeline was
    // already the product decision (task doc, 2026-07-17); what this line adds
    // is saying it out loud, because publishing the same piece twice costs SEO
    // and that cost is invisible on screen.
    // Kept to one line on purpose (Fer, 2026-07-26): the hint is capped at 68ch
    // in `StepSection`, so a 140-character version wrapped to two lines however
    // wide the screen was. A hint that needs a paragraph is not a hint.
    draftHint: "Versión propia, reescrita para no competir con la de Motor.es en Google.",
    dateLabel: "Día de publicación",
    dateHint:
      "Se publicará solo, a las 8:00 de la mañana (hora de Madrid). Puedes cambiar el día después desde Artículos.",
    publishHour: "08:00",
    finalLabel: "Programar la publicación",
    finalRunningLabel: "Programando…",
    doneTitle: "Publicación programada",
    doneHint: "El artículo queda en borrador y se publicará en EVminds en la fecha prevista.",
  },
];

export function getChannel(value: PublishChannel): ChannelSpec {
  const spec = CHANNELS.find((c) => c.value === value);
  if (!spec) throw new Error(`Unknown publish channel: ${value}`);
  return spec;
}

/** Keeps the channel order stable wherever a selection is rendered. */
export function orderChannels(channels: PublishChannel[]): PublishChannel[] {
  return CHANNELS.map((c) => c.value).filter((v) => channels.includes(v));
}

/**
 * Parses a comma-separated channel list into a valid, ordered, never-empty one.
 *
 * Its input used to be the `?canales=` parameter; since phase 2b it is the
 * piece's stored `channels` column, which is the same shape and cannot be
 * hand-edited into contradicting what the piece was created for.
 */
export function parseChannels(raw: string | null): PublishChannel[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is PublishChannel => c === "motor" || c === "evminds");
  const ordered = orderChannels(parsed);
  return ordered.length ? ordered : ["motor", "evminds"];
}
