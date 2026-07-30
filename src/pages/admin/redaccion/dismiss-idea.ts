import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/dismiss-idea
 *
 * "Descartar": a hard delete, not a status change. Fer chose (2026-07-28) not
 * to remember discards — no `rejected` row is ever kept, so a dismissed
 * article can resurface in a later batch if it is still within the curator's
 * recency window. Only `pending` proposals can be dismissed (the only cards
 * `PickIdeaStep.tsx` wires the dismiss action to); a saved or picked idea is
 * removed from elsewhere, never from here.
 *
 * **Narrower exception added 2026-07-29** (Fer): the same article was
 * immediately resurfacing on the very next "Volver a generar", since nothing
 * excluded it. The idea itself still leaves no trace, but its `source_url`
 * is logged for 48h in `editorial_dismissed_urls` (migration 56) — a table
 * `curate-ideas.ts` alone reads, never shown in any UI — so it isn't
 * re-proposed immediately. After that window it can resurface exactly as
 * before.
 *
 * Body JSON: { id }
 * Response: { ok: true } | { error }
 */

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ error: "No autenticado." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido." }, 400);
  }

  const id = (body as { id?: unknown })?.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return json({ error: "Falta la idea a descartar." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("editorial_candidates")
      .delete()
      .eq("id", id)
      .eq("status", "pending")
      .select("source_url")
      .maybeSingle();
    if (error) throw error;

    if (data?.source_url) {
      const { error: logError } = await supabase
        .from("editorial_dismissed_urls")
        .upsert({ source_url: data.source_url, dismissed_at: new Date().toISOString() });
      // Never worth failing the dismiss over: the card is already gone from
      // view either way, and a missed log entry only costs one more repeat.
      if (logError) console.error("dismiss-idea: could not log source_url:", logError);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("dismiss-idea error:", err);
    return json({ error: "No se pudo descartar la idea." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
