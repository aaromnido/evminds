/**
 * Every URL of the Redacción section, built in one place (task A3, phase 2b).
 *
 * **Why a module for six strings.** `pnpm check` does not read the inside of an
 * `href`, so a route that moves and a link that does not is a failure the gate
 * cannot see: it does not error, it just takes you somewhere else. This section
 * builds its URLs from six different components, and that is exactly the shape of
 * bug it has already produced twice — a `?fecha=` that did not survive the trip,
 * and a "Volver atrás" that lost its piece.
 *
 * The URLs read as what they are, because the piece is a resource and not a
 * parameter:
 *
 * ```
 * /admin/redaccion                      las piezas (portada de la sección)
 * /admin/redaccion/nueva                paso ① · elegir tema
 * /admin/redaccion/nueva/enfoque        paso ② · antes de que la pieza exista
 * /admin/redaccion/pieza/<id>           paso ② · el enfoque de una pieza que ya existe
 * /admin/redaccion/pieza/<id>/<canal>   pasos ③/④ · una pantalla por canal
 * /admin/redaccion/ideas                el banco de ideas (fase 7)
 * ```
 *
 * The brief of an existing piece is the piece's **root** and not
 * `/pieza/<id>/enfoque` on purpose: that would sit in the same slot as
 * `[canal]`, and a channel named `enfoque` would be shadowed by it. Static
 * segments beating dynamic ones is a rule that works until the day it quietly
 * does not.
 */

import type { PublishChannel } from "./editorial-types";

export const REDACCION_BASE = "/admin/redaccion";

/** The section's landing: everything written, finished or not. */
export function piecesUrl(): string {
  return REDACCION_BASE;
}

/** Step ①: pick a topic. */
export function newPieceUrl(): string {
  return `${REDACCION_BASE}/nueva`;
}

/** Step ② for a piece that does not exist yet, optionally from a picked idea. */
export function newAngleUrl(ideaId?: string | null): string {
  const base = `${REDACCION_BASE}/nueva/enfoque`;
  return ideaId ? `${base}?idea=${encodeURIComponent(ideaId)}` : base;
}

/** Step ② for a piece that already exists — its brief. */
export function pieceBriefUrl(pieceId: string): string {
  return `${REDACCION_BASE}/pieza/${pieceId}`;
}

/** Steps ③/④: one channel of one piece. */
export function channelUrl(pieceId: string, channel: PublishChannel): string {
  return `${REDACCION_BASE}/pieza/${pieceId}/${channel}`;
}

/** The idea bank: saved and own ideas, plus their history (phase 7). */
export function ideasUrl(): string {
  return `${REDACCION_BASE}/ideas`;
}
