import type { APIRoute } from "astro";
import { ARCHIVED_DELETE_MIN_AGE_DAYS } from "@/lib/article-utils";

/**
 * POST /admin/noticias/delete
 *
 * Hard-deletes archived news articles that are old enough to be safe from
 * scraper resurrection (>30 days — ADR-003). Lives under /admin so the
 * middleware gate (admin role + verified JWT) protects it automatically.
 *
 * Body JSON:
 *   { ids: string[] }   — delete specific articles by id
 *   { all: true }       — delete ALL eligible archived articles
 *
 * The server enforces eligibility regardless of what the client sends:
 *   - content_type = 'news'
 *   - archived = true
 *   - published_at < (now - 30 days)
 *
 * Response: { ok: true, deleted: number } | { error: string }
 */

export const POST: APIRoute = async ({ request, locals }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body JSON inválido." }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return json({ error: "Body inválido." }, 400);
  }

  const { ids, all } = body as { ids?: unknown; all?: unknown };

  if (!all && (!Array.isArray(ids) || ids.length === 0)) {
    return json({ error: "Proporciona ids[] o all:true." }, 400);
  }
  if (!all && Array.isArray(ids) && ids.some((id) => typeof id !== "string")) {
    return json({ error: "Todos los ids deben ser strings." }, 400);
  }

  // Server-side eligibility cutoff — mirrors isDeletableArchived() on the client.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVED_DELETE_MIN_AGE_DAYS);
  const cutoffISO = cutoff.toISOString();

  try {
    const supabase = locals.supabase;
    if (!supabase) return json({ error: "No autenticado." }, 401);

    let query = supabase
      .from("articles")
      .delete()
      .eq("content_type", "news")
      .eq("archived", true as never)
      .lt("published_at", cutoffISO)
      .select("id");

    if (!all) {
      query = query.in("id", ids as string[]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[delete-news] Supabase error:", error);
      return json({ error: "Error al eliminar las noticias." }, 500);
    }

    const deleted = (data ?? []).length;
    const requested = all ? "all" : (ids as string[]).length;

    if (deleted === 0) {
      console.warn(
        `[delete-news] BLOCKED — 0 rows deleted. ` +
        `Requested: ${requested} id(s). ` +
        `Cutoff: published_at < ${cutoffISO} (>${ARCHIVED_DELETE_MIN_AGE_DAYS} days). ` +
        `All rows failed the eligibility filter (not archived, too recent, or wrong content_type).`
      );
    } else if (!all && deleted < (ids as string[]).length) {
      console.warn(
        `[delete-news] PARTIAL block — ${deleted}/${(ids as string[]).length} rows deleted. ` +
        `${(ids as string[]).length - deleted} id(s) were ineligible (not archived or published_at >= ${cutoffISO}).`
      );
    } else {
      console.log(`[delete-news] OK — deleted ${deleted} row(s).`);
    }

    return json({ ok: true, deleted });
  } catch (err) {
    console.error("delete archived news unexpected error:", err);
    return json({ error: "Error inesperado." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
