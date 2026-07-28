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
    const { error } = await supabase
      .from("editorial_candidates")
      .delete()
      .eq("id", id)
      .eq("status", "pending");
    if (error) throw error;
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
