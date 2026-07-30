import type { APIRoute } from "astro";
import { readReferenceLink } from "@/lib/reference-link-reader";

/**
 * POST /admin/redaccion/read-link
 *
 * Admin-gated. Reads a reference link for step ②'s "leído/no se pudo leer"
 * feedback (`DefineAngleStep`). Not a proxy to a Supabase Edge Function —
 * there's no secret or Gemini key involved, so this calls the shared reader
 * directly. The content read here is for UI feedback only: `generate-draft.ts`
 * re-fetches fresh at generate time rather than carrying it through, so a
 * piece resumed days later still gets real reference content instead of
 * silently losing it (nothing about a link's content is persisted).
 *
 * Body: { url }
 * Response: { ok: true, title } | { ok: false, error }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase) return json({ ok: false, error: "No autenticado." }, 401);

  const body = await request.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return json({ ok: false, error: "Falta el enlace." }, 400);

  const result = await readReferenceLink(url);
  return json(result);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
