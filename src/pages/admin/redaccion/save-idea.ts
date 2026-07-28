import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/save-idea
 *
 * "Guardar para otra ocasión": one-way, only from a `pending` curator proposal
 * (the only cards `PickIdeaStep.tsx` wires the save action to). Once saved, an
 * idea survives regeneration — the point of the button.
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
    return json({ error: "Falta la idea a guardar." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("editorial_candidates")
      .update({ status: "saved" })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Esta idea ya no está disponible." }, 409);
    return json({ ok: true });
  } catch (err) {
    console.error("save-idea error:", err);
    return json({ error: "No se pudo guardar la idea." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
