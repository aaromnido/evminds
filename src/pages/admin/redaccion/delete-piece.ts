import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/delete-piece
 *
 * Deletes one piece and, through `ON DELETE CASCADE`, its channel drafts. Under
 * /admin, so the middleware gate protects it, and through `locals.supabase` so
 * RLS applies.
 *
 * **Nothing here is deleted automatically, ever.** A piece is a written article,
 * and a retention rule that destroyed work on a timer would be a far worse
 * failure than a list that grows. Deleting is manual, always available, and this
 * is the only thing that does it.
 *
 * An EVminds article that was already scheduled is NOT deleted with the piece:
 * `editorial_channel_drafts.post_id` is `ON DELETE SET NULL` in the other
 * direction, and the `posts` row is nobody's to remove from here — it lives in
 * Artículos.
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
    return json({ error: "Falta la pieza a borrar." }, 400);
  }

  try {
    const { error } = await supabase.from("editorial_pieces").delete().eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error("delete-piece error:", err);
    return json({ error: "No se pudo borrar la pieza." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
