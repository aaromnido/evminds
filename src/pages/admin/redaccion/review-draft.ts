import type { APIRoute } from "astro";
import type { PublishChannel } from "@/lib/editorial-types";

/**
 * POST /admin/redaccion/review-draft
 *
 * Admin-gated proxy to the `editorial-review` Edge Function, mirroring
 * `generate-draft.ts`: holds SCRAPE_SECRET server-side and forwards the
 * already-written draft. The browser never holds the secret or the Gemini
 * key.
 *
 * Unlike `generate-draft.ts`, this has no database work to do: the reviewer
 * needs nothing beyond what the wizard already holds in memory (the brief
 * and the current title/body), so this proxy is a thin pass-through.
 *
 * Body: { channel, briefTitle, briefAngle, title, body }
 * Response: { ok: true, contenido, forma, ortografia } | { error }
 */

const VALID_CHANNELS: PublishChannel[] = ["motor", "evminds"];

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.supabase) return json({ error: "No autenticado." }, 401);

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

  const channel = VALID_CHANNELS.find((c) => c === input.channel);
  if (!channel) return json({ error: "Canal desconocido." }, 400);

  const briefTitle = str(input.briefTitle);
  const briefAngle = str(input.briefAngle);
  const title = str(input.title);
  const articleBody = str(input.body);
  if (!briefTitle || !briefAngle || !title || !articleBody) {
    return json({ error: "Falta el tema, el enfoque, el título o el cuerpo del artículo." }, 400);
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SCRAPE_SECRET;
  if (!supabaseUrl || !secret) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/editorial-review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ channel, briefTitle, briefAngle, title, body: articleBody }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "La revisión falló." }, res.status);
    }
    return json(data);
  } catch (err) {
    console.error("review-draft proxy error:", err);
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
