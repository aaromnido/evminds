import type { APIRoute } from "astro";
import { mapCandidateRow } from "@/lib/editorial-ideas";

/**
 * POST /admin/redaccion/create-idea
 *
 * `CreateIdeaDrawer` — Fer writing his own idea by hand. Persisted from birth
 * as `saved` (mirrors `buildOwnIdea`'s mock behaviour): an idea Fer typed
 * himself was never a transient proposal to begin with.
 *
 * Body JSON: { proposed_title_es, angle, rationale, reference_urls }
 * (`reference_urls` as typed, one URL per line — split here, same as the
 * piece-level R1 links).
 * Response: { ok: true, idea: IdeaCandidate } | { error }
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

  const input = body as Record<string, unknown>;
  const proposedTitleEs = str(input.proposed_title_es);
  const angle = str(input.angle);
  const rationale = str(input.rationale);
  if (!proposedTitleEs || !angle) {
    return json({ error: "Falta el título o el enfoque de la idea." }, 400);
  }

  const referenceUrls = str(input.reference_urls)
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  try {
    const { data, error } = await supabase
      .from("editorial_candidates")
      .insert({
        origin: "own",
        source_url: null,
        source_title: null,
        source_name: null,
        source_excerpt: null,
        proposed_title_es: proposedTitleEs,
        angle,
        rationale,
        reference_urls: referenceUrls,
        status: "saved",
      })
      .select("*")
      .single();
    if (error) throw error;
    return json({ ok: true, idea: mapCandidateRow(data) });
  } catch (err) {
    console.error("create-idea error:", err);
    return json({ error: "No se pudo crear la idea." }, 500);
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
