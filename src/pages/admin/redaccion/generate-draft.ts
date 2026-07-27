import type { APIRoute } from "astro";
import { parseMotorPayload } from "@/lib/editorial-drafts";
import type { PublishChannel } from "@/lib/editorial-types";

/**
 * POST /admin/redaccion/generate-draft
 *
 * Admin-gated proxy to the `editorial-redactor` Edge Function, mirroring
 * `noticias/[id]/regenerate.ts`: holds SCRAPE_SECRET server-side and forwards
 * the brief. The browser never holds the secret or the Gemini key.
 *
 * EVminds-only extra: resolves the sibling Motor.es draft HERE, via the same
 * authed `locals.supabase` the rest of /admin uses (RLS applies), rather than
 * in the function — the redactor's technical contract keeps that function
 * database-free. Only forwarded when Motor.es is actually `published`; a
 * finished-but-unpublished draft says nothing about what a reader would have
 * seen this week.
 *
 * Body: { pieceId, channel, briefTitle, briefAngle, referenceContent?,
 *         sourceName?, sourceUrl?, weeklyNotes? }
 * Response: the redactor's own shape — { ok: true, title, body, ... } | { error }
 */

const VALID_CHANNELS: PublishChannel[] = ["motor", "evminds"];

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ error: "No autenticado." }, 401);

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

  const pieceId = str(input.pieceId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pieceId)) {
    return json({ error: "Falta la pieza para la que se genera el borrador." }, 400);
  }

  const channel = VALID_CHANNELS.find((c) => c === input.channel);
  if (!channel) return json({ error: "Canal desconocido." }, 400);

  const briefTitle = str(input.briefTitle);
  const briefAngle = str(input.briefAngle);
  if (!briefTitle || !briefAngle) {
    return json({ error: "Falta el titular o el ángulo del brief." }, 400);
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SCRAPE_SECRET;
  if (!supabaseUrl || !secret) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }

  const requestBody: Record<string, unknown> = {
    channel,
    briefTitle,
    briefAngle,
    referenceContent: typeof input.referenceContent === "string" ? input.referenceContent : "",
    sourceName: str(input.sourceName) || null,
    sourceUrl: str(input.sourceUrl) || null,
  };

  if (channel === "evminds") {
    requestBody.weeklyNotes = str(input.weeklyNotes) || null;

    const { data: motorRow } = await supabase
      .from("editorial_channel_drafts")
      .select("title, body, payload")
      .eq("piece_id", pieceId)
      .eq("channel", "motor")
      .maybeSingle();

    const motorPayload = motorRow ? parseMotorPayload(motorRow.payload) : null;
    requestBody.motorDraft =
      motorRow && motorPayload?.published
        ? { title: motorRow.title, lead: motorPayload.lead, body: motorRow.body }
        : null;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/editorial-redactor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(requestBody),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "La generación falló." }, res.status);
    }
    return json(data);
  } catch (err) {
    console.error("generate-draft proxy error:", err);
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
