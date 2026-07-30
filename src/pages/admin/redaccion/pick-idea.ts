import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/pick-idea
 *
 * Marks an idea as picked BEFORE navigating to step ②, not when the piece is
 * later saved — so an idea leaves "Propuestas de hoy"/"Guardadas" and lands in
 * history immediately, even if the piece itself never gets finished. Only
 * `pending` or `saved` ideas can be picked, matching where the UI wires the
 * "Escribir sobre esto" action (never on a history card).
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
    return json({ error: "Falta la idea a elegir." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("editorial_candidates")
      .update({ status: "picked", picked_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["pending", "saved"])
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Esta idea ya no está disponible." }, 409);
    return json({ ok: true });
  } catch (err) {
    console.error("pick-idea error:", err);
    return json({ error: "No se pudo elegir la idea." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
