import type { APIRoute } from "astro";

/**
 * POST /admin/redaccion/expand-idea
 *
 * Admin-gated proxy to the `editorial-expand-idea` Edge Function, mirroring
 * `generate-draft.ts`: holds SCRAPE_SECRET server-side, browser never sees it.
 *
 * Body: { title, angle }
 * Response: { ok: true, angle, rationale } | { error }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase) return json({ error: "No autenticado." }, 401);

  const body = await request.json().catch(() => ({}));
  const title = str(body?.title);
  const angle = str(body?.angle);
  if (!title && !angle) {
    return json({ error: "Falta título o enfoque de partida." }, 400);
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SCRAPE_SECRET;
  if (!supabaseUrl || !secret) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/editorial-expand-idea`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ title, angle }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "La generación falló." }, res.status);
    }
    return json(data);
  } catch (err) {
    console.error("expand-idea proxy error:", err);
    return json({ error: "No se pudo contactar con la función." }, 502);
  }
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
