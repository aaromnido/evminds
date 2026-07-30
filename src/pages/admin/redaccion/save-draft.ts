import type { APIRoute } from "astro";
import { channelDraftToRow, parseChannelPayload } from "@/lib/editorial-drafts";
import type { PublishChannel } from "@/lib/editorial-types";

/**
 * POST /admin/redaccion/save-draft
 *
 * Upserts one channel's draft — the autosave endpoint of steps ③ and ④. Same
 * gate and same authed client as the rest of /admin, so RLS applies.
 *
 * One row per (piece, channel), which is what `UNIQUE (piece_id, channel)` in
 * migration 53 enforces: two autosaves racing produce one row, not two.
 *
 * Body JSON: { pieceId, channel, title, body, imageUrl?, publishDate?, payload?, status? }
 * Response: { ok: true } | { error }
 *
 * The payload goes through the same parser the screen reads it back with, so a
 * malformed client can never write a shape that would later fail to load.
 */

const VALID_CHANNELS: PublishChannel[] = ["motor", "evminds"];
/** Terminal states mean different things per channel — see migration 53. */
const VALID_STATUSES = ["draft", "done", "scheduled"] as const;

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ error: "No autenticado." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido." }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return json({ error: "Body inválido." }, 400);
  }

  const input = body as Record<string, unknown>;

  const pieceId = typeof input.pieceId === "string" ? input.pieceId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pieceId)) {
    return json({ error: "Falta la pieza a la que pertenece el borrador." }, 400);
  }

  const channel = VALID_CHANNELS.find((c) => c === input.channel);
  if (!channel) return json({ error: "Canal desconocido." }, 400);

  const status = VALID_STATUSES.find((s) => s === input.status) ?? "draft";

  const row = channelDraftToRow({
    title: str(input.title),
    body: str(input.body),
    imageUrl: str(input.imageUrl),
    // The day, never an instant. Anything that is not `YYYY-MM-DD` is dropped
    // rather than sent to a `date` column that would reject it with a 500.
    publishDate: /^\d{4}-\d{2}-\d{2}$/.test(str(input.publishDate)) ? str(input.publishDate) : null,
    payload: parseChannelPayload(channel, input.payload),
  });

  try {
    const { error } = await supabase.from("editorial_channel_drafts").upsert(
      { piece_id: pieceId, channel, status, ...row },
      // Without this, a second autosave would insert a duplicate and hit the
      // unique index instead of updating the row it meant to.
      { onConflict: "piece_id,channel" },
    );
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error("save-draft error:", err);
    return json({ error: "No se pudo guardar el borrador." }, 500);
  }
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
