import type { APIRoute } from "astro";
import { mapCandidateRow } from "@/lib/editorial-ideas";

/**
 * POST /admin/redaccion/update-idea
 *
 * The Ideas section's edit: text fields only, and only on `saved` rows — history
 * (`picked`/`expired`) is closed, not editable. Applies to any `saved` idea
 * regardless of origin (curator-sourced or Fer's own): the source fields
 * (`source_url`/`source_name`/`source_excerpt`) are never part of this call, so
 * there is nothing origin-specific to protect against.
 *
 * Body JSON: { id, proposed_title_es, angle, rationale, reference_urls }
 * (`reference_urls` as typed, one URL per line — split here, same as
 * `create-idea.ts`.)
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
  const id = input.id;
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return json({ error: "Falta la idea a editar." }, 400);
  }

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
      .update({
        proposed_title_es: proposedTitleEs,
        angle,
        rationale,
        reference_urls: referenceUrls,
      })
      .eq("id", id)
      .eq("status", "saved")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Esta idea ya no está disponible." }, 409);
    return json({ ok: true, idea: mapCandidateRow(data) });
  } catch (err) {
    console.error("update-idea error:", err);
    return json({ error: "No se pudo guardar los cambios." }, 500);
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
