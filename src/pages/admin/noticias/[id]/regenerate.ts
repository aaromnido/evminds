import type { APIRoute } from "astro";

/**
 * POST /admin/noticias/{id}/regenerate
 *
 * Admin-gated proxy to the `regenerate-ai` Edge Function. Lives under /admin so
 * the middleware protects it; holds SCRAPE_SECRET server-side (never shipped to
 * the browser) and forwards the article id to the function.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "Falta el id." }, 400);

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SCRAPE_SECRET;
  if (!supabaseUrl || !secret) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }

  // Optional `only` ('seo_title') selects the Edge Function's isolated mode that
  // regenerates just that field; absent → full redo (current behaviour).
  const body = await request.json().catch(() => ({}));
  const only = body?.only === "seo_title" ? "seo_title" : undefined;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/regenerate-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(only ? { id, only } : { id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "La regeneración falló." }, res.status);
    }
    return json(data);
  } catch (err) {
    console.error("regenerate proxy error:", err);
    return json({ error: "No se pudo contactar con la función." }, 502);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
