import type { APIRoute } from "astro";
import type { PublishChannel } from "@/lib/editorial-types";

/**
 * POST /admin/redaccion/save-piece
 *
 * Creates (or updates the brief of) a piece in the editorial wizard. Lives under
 * /admin so the middleware gate — verified JWT + admin role — protects it, and
 * writes through `locals.supabase`, the request's own authed client, so the RLS
 * policy from migration 53 applies rather than being bypassed by a service key.
 *
 * The row is born when step ② is left, either by generating the draft or by
 * saving to come back later. Not on arrival: a row per visit to the screen would
 * fill the list with empty pieces, which is the graveyard this phase exists to
 * avoid. And not at the first "Guardar borrador" either: an interruption before
 * remembering to press it would lose the work — and, from phase 3 on, a paid
 * generation — with nothing left behind.
 *
 * Body JSON: { id?, briefTitle, briefAngle?, referenceUrls?, channels,
 *              ideaId?, sourceName?, sourceUrl? }
 * Response: { id } | { error }
 *
 * `ideaId` is stored WITHOUT a foreign key and the source is copied, on purpose:
 * the Ideas section must allow deleting, and a written piece has to survive the
 * idea it came from.
 */

const VALID_CHANNELS: PublishChannel[] = ["motor", "evminds"];

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
  const briefTitle = text(input.briefTitle);
  if (!briefTitle) return json({ error: "Falta el titular del brief." }, 400);

  // Whatever the client sends, only our own channel identifiers get stored.
  const channels = Array.isArray(input.channels)
    ? VALID_CHANNELS.filter((c) => (input.channels as unknown[]).includes(c))
    : [];
  if (channels.length === 0) return json({ error: "Elige al menos un canal." }, 400);

  const fields = {
    brief_title: briefTitle,
    brief_angle: text(input.briefAngle),
    reference_urls: Array.isArray(input.referenceUrls)
      ? input.referenceUrls.filter((u): u is string => typeof u === "string")
      : [],
    idea_id: uuidOrNull(input.ideaId),
    source_name: text(input.sourceName) || null,
    source_url: text(input.sourceUrl) || null,
    channels,
  };

  try {
    const id = uuidOrNull(input.id);

    if (id) {
      const { data, error } = await supabase
        .from("editorial_pieces")
        .update(fields)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      return json({ id: data.id });
    }

    const { data, error } = await supabase
      .from("editorial_pieces")
      .insert({ ...fields, status: "in_progress" })
      .select("id")
      .single();
    if (error) throw error;
    return json({ id: data.id });
  } catch (err) {
    console.error("save-piece error:", err);
    return json({ error: "No se pudo guardar la pieza." }, 500);
  }
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Only a well-formed uuid reaches the query. Anything else becomes null, so a
 * junk id is "create a new piece" rather than a 500 from Postgres.
 */
function uuidOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
