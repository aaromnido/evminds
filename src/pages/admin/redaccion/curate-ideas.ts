import type { APIRoute } from "astro";
import type { Database } from "@/lib/database.types";
import { mapCandidateRow } from "@/lib/editorial-ideas";
import { toDisplayName } from "@/lib/sources";

/**
 * POST /admin/redaccion/curate-ideas
 *
 * Admin-gated proxy to the `editorial-curator` Edge Function — the only side
 * of the wizard that reads the database on BOTH sides of a Gemini call (every
 * other side-call proxy is a query before or after, never both): it resolves
 * which recent `articles` are worth proposing, calls the function, runs the
 * fuzzy-title dedup, and persists the survivors. The function itself stays
 * database-free, matching the rest of the pipeline's contract.
 *
 * CACHE, NOT "GENERATE EVERY VISIT" (Fer, 2026-07-28): a `pending` batch is a
 * one-day cache (`expires_at`, migration 54), not a call made on every page
 * load. This route reuses an unexpired batch unless `force` is set — which is
 * what "Volver a generar" sends.
 *
 * Body: { force?: boolean }
 * Response: { ok: true, candidates: IdeaCandidate[] } | { error }
 */

/** How far back the curator looks for source articles. */
const RECENCY_DAYS = 4;
/** How many raw articles to hand the model to choose from. */
const ARTICLE_POOL_LIMIT = 40;
/** How many candidates to ask the model to shape. */
const TARGET_COUNT = 6;
/** A fresh batch's shelf life — mirrors the `expires_at` comment in migration 54. */
const CACHE_HOURS = 48;
/** Same threshold as the RPC's default; passed explicitly to keep it visible here. */
const TITLE_SIMILARITY_THRESHOLD = 0.45;

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ error: "No autenticado." }, 401);

  const body = await request.json().catch(() => ({}));
  const force = Boolean((body as Record<string, unknown>)?.force);

  if (!force) {
    const { data: cached } = await supabase
      .from("editorial_candidates")
      .select("*")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (cached && cached.length > 0) {
      return json({ ok: true, candidates: cached.map(mapCandidateRow) });
    }
  }

  // Replacing the batch: leftover `pending` rows are not deleted, they become
  // history (`PickIdeaStep.tsx`'s "Ya escritas o caducadas" already expects
  // expired rows to still exist — see migration 54).
  await supabase.from("editorial_candidates").update({ status: "expired" }).eq("status", "pending");

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SCRAPE_SECRET;
  if (!supabaseUrl || !secret) {
    return json({ error: "Configuración del servidor incompleta." }, 500);
  }

  // Real coverage: never re-propose something already picked or saved,
  // regardless of how fresh it still looks. This is independent of "Volver a
  // generar" — it applies every time a batch is built.
  const { data: coveredRows } = await supabase
    .from("editorial_candidates")
    .select("source_url")
    .in("status", ["picked", "saved"])
    .not("source_url", "is", null);
  const covered = new Set((coveredRows ?? []).map((r) => r.source_url));

  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: articleRows } = await supabase
    .from("articles")
    .select("article_url, title, excerpt, published_at, sources(name)")
    .eq("archived", false)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(ARTICLE_POOL_LIMIT);

  type ArticleRow = {
    article_url: string;
    title: string;
    excerpt: string;
    published_at: string;
    sources: { name: string } | { name: string }[] | null;
  };

  const pool = ((articleRows ?? []) as ArticleRow[]).filter((a) => !covered.has(a.article_url));

  if (pool.length === 0) return json({ ok: true, candidates: [] });

  const bySourceUrl = new Map(pool.map((a) => [a.article_url, a]));

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/editorial-curator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        count: TARGET_COUNT,
        articles: pool.map((a) => ({
          sourceUrl: a.article_url,
          title: a.title,
          sourceName: toDisplayName(sourceName(a.sources)),
          excerpt: a.excerpt,
          publishedAt: a.published_at,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: data.error || "La generación falló." }, res.status);
    }

    const rawCandidates: {
      sourceUrl: string;
      proposedTitleEs: string;
      angle: string;
      rationale: string;
    }[] = Array.isArray(data.candidates) ? data.candidates : [];

    if (rawCandidates.length === 0) return json({ ok: true, candidates: [] });

    // Fuzzy dedup against what we've already published, on the SPANISH title —
    // the raw English article title tells us nothing here (see migration 55).
    const { data: coveredTitles } = await supabase.rpc("covered_post_titles", {
      candidate_titles: rawCandidates.map((c) => c.proposedTitleEs),
      days: 7,
      threshold: TITLE_SIMILARITY_THRESHOLD,
    });
    const coveredTitleSet = new Set(coveredTitles ?? []);

    const survivors = rawCandidates.filter((c) => !coveredTitleSet.has(c.proposedTitleEs));
    if (survivors.length === 0) return json({ ok: true, candidates: [] });

    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + CACHE_HOURS * 60 * 60 * 1000);

    const inserts: Database["public"]["Tables"]["editorial_candidates"]["Insert"][] = survivors.map(
      (c) => {
        const article = bySourceUrl.get(c.sourceUrl);
        return {
          origin: "curator",
          source_url: c.sourceUrl,
          source_title: article?.title ?? null,
          source_name: article ? toDisplayName(sourceName(article.sources)) : null,
          source_excerpt: article?.excerpt ?? null,
          proposed_title_es: c.proposedTitleEs,
          angle: c.angle,
          rationale: c.rationale,
          status: "pending",
          fetched_at: fetchedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        };
      },
    );

    const { data: inserted, error: insertError } = await supabase
      .from("editorial_candidates")
      .insert(inserts)
      .select("*");

    if (insertError || !inserted) {
      console.error("curate-ideas insert error:", insertError);
      return json({ error: "No se pudieron guardar las propuestas." }, 500);
    }

    return json({ ok: true, candidates: inserted.map(mapCandidateRow) });
  } catch (err) {
    console.error("curate-ideas proxy error:", err);
    return json({ error: "No se pudo contactar con la función." }, 502);
  }
};

function sourceName(sources: { name: string } | { name: string }[] | null): string {
  if (!sources) return "";
  return Array.isArray(sources) ? (sources[0]?.name ?? "") : sources.name;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
