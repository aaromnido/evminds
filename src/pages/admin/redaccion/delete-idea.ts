import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/delete-idea
 *
 * The Ideas section's delete: a real, permanent removal, unlike `dismiss-idea.ts`
 * (which only ever touches a transient `pending` proposal). This is the "Ideas
 * gestiona" half of "Redacción elige, Ideas gestiona" — it reaches `saved`,
 * `picked` and `expired` rows (the bank plus its history), never `pending`.
 *
 * Safe against a piece that already exists: `editorial_pieces.idea_id` has no
 * foreign key on purpose (migration 53), specifically so tidying up the idea
 * bank can never cascade into deleting a written piece.
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
    return json({ error: "Falta la idea a borrar." }, 400);
  }

  try {
    const { error } = await supabase
      .from("editorial_candidates")
      .delete()
      .eq("id", id)
      .in("status", ["saved", "picked", "expired"]);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error("delete-idea error:", err);
    return json({ error: "No se pudo borrar la idea." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
