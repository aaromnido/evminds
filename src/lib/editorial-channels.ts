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
  /** Label and hint of the date field on that channel's screen. Always required. */
  dateLabel: string;
  dateHint: string;
  /** The screen's single primary action. */
  finalLabel: string;
  finalRunningLabel: string;
  /** What the completion state says once that action succeeded. */
  doneTitle: string;
  doneHint: string;
  /**
   * Where the finished piece can be seen for this channel, if anywhere.
   *
   * Only set where we actually host it: an EVminds article lands in "Artículos
   * propios" and can be opened. A Motor.es piece lives in someone else's CMS
   * and all we keep is the backup copy, which has no screen of its own yet — so
   * that channel has no result link and its completion screen keeps "Volver a
   * Redacción" as its single action.
   */
  resultLabel?: string;
  resultHref?: string;
}

export const CHANNELS: ChannelSpec[] = [
  {
    value: "motor",
    name: "Motor.es",
    description: "Tu colaboración. Se genera el texto y lo copias a su CMS con la imagen.",
    handoff: "copy",
    dateLabel: "Fecha prevista de publicación",
    dateHint:
      "Su ritmo editorial no lo controlamos desde aquí. Apunta cuándo esperas que salga para cuadrar la tuya, y cámbialo luego si se mueve.",
    finalLabel: "Copiar el texto",
    finalRunningLabel: "Copiando…",
    doneTitle: "Texto copiado",
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
    dateLabel: "Fecha de publicación",
    dateHint: "Se publicará solo a esa hora. Puedes cambiarla después desde Artículos.",
    finalLabel: "Programar la publicación",
    finalRunningLabel: "Programando…",
    doneTitle: "Publicación programada",
    doneHint: "El artículo queda en borrador y saldrá solo a la hora que has puesto.",
    resultLabel: "Versión EVminds",
    resultHref: "/admin/posts",
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

/** Parses the `?canales=` param into a valid, ordered, never-empty selection. */
export function parseChannels(raw: string | null): PublishChannel[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is PublishChannel => c === "motor" || c === "evminds");
  const ordered = orderChannels(parsed);
  return ordered.length ? ordered : ["motor"];
}
