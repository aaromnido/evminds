import type { APIRoute } from "astro";
import { parseEvmindsPayload } from "@/lib/editorial-drafts";
import { localPublishInstant } from "@/lib/local-time";
import { markdownToHtml } from "@/lib/markdown";
import { purgeTags } from "@/lib/cache-purge";

/**
 * POST /admin/redaccion/publish-post
 *
 * Turns the EVminds channel's stored draft into a real `posts` row — the step
 * that used to be a simulated status change (task A3, phase 4). "Programar la
 * publicación" now means exactly what migration 33 defines: a `posts` row with
 * `status='published'` and a future `published_at`. There is no `draft` status
 * here and no cron — the row is simply invisible until `published_at <= now()`.
 *
 * Deliberately its own endpoint, not folded into `save-draft.ts`: this is the
 * only place that ever writes `editorial_channel_drafts.status = 'scheduled'`,
 * and it does so in the same request as the `posts` write, right after it
 * succeeds — so the two can never drift into "scheduled but no post exists" or
 * a `posts` row with nothing linking back to it.
 *
 * Reads the just-autosaved draft row as its source of truth instead of
 * accepting the fields over the wire a second time. The caller
 * (`PublishChannelStep`'s `handlePrimary`) flushes via `save-draft` immediately
 * before calling this.
 *
 * Slugs are never blocked (Fer's call, 2026-07-27): a collision gets `-2`,
 * `-3`… appended until free. The final slug — possibly different from what was
 * on screen when the button was pressed — comes back in the response so the UI
 * can update itself and stay honest about the real published URL.
 *
 * Body: { pieceId }
 * Response: { ok: true, slug, postId } | { error }
 */

const MAX_SLUG_ATTEMPTS = 20;

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

  const pieceId = str((body as Record<string, unknown>).pieceId);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pieceId)) {
    return json({ error: "Falta la pieza que se va a publicar." }, 400);
  }

  const { data: draftRow, error: draftError } = await supabase
    .from("editorial_channel_drafts")
    .select("*")
    .eq("piece_id", pieceId)
    .eq("channel", "evminds")
    .maybeSingle();

  if (draftError || !draftRow) {
    return json({ error: "No hay ningún borrador de EVminds que publicar." }, 400);
  }

  const payload = parseEvmindsPayload(draftRow.payload);
  const title = draftRow.title.trim();
  const bodyMarkdown = draftRow.body.trim();
  const imageUrl = draftRow.image_url?.trim() ?? "";
  const publishDate = draftRow.publish_date ?? "";
  const baseSlug = payload.slug.trim();

  // Defense in depth: the wizard already blocks the button on the same rules
  // (`validateChannelDraft`), so this should never fire from the UI. It exists
  // for anything that calls this endpoint directly.
  const missing: string[] = [];
  if (!title) missing.push("el titular");
  if (!bodyMarkdown) missing.push("el texto");
  if (!imageUrl) missing.push("la imagen");
  if (!publishDate) missing.push("la fecha de publicación");
  if (!baseSlug) missing.push("la URL del artículo");
  if (!payload.excerpt.trim()) missing.push("el extracto");
  if (!payload.imageAlt.trim()) missing.push("el texto alternativo de la imagen");
  if (missing.length) {
    return json({ error: `Falta completar antes de publicar: ${missing.join(", ")}.` }, 400);
  }

  let publishedAt: string;
  try {
    publishedAt = localPublishInstant(publishDate);
  } catch {
    return json({ error: "La fecha de publicación no es válida." }, 400);
  }

  const postFields = {
    title,
    excerpt: payload.excerpt.trim(),
    content: markdownToHtml(bodyMarkdown),
    category: payload.category,
    tags: payload.tags,
    image_url: imageUrl,
    image_alt: payload.imageAlt.trim(),
    // ⚠️ TEMPORARY SAFETY OVERRIDE (Fer, 2026-07-27): forced to 'draft' while
    // this phase is being tested against the REAL production DB — there is no
    // staging, so this guarantees a test schedule can never go live by
    // accident (posts_public_read requires status='published' regardless of
    // published_at). NOT the final behavior — revert to 'published' once Fer
    // has verified scheduling and rescheduling end to end. See the note in
    // .claude/plans/plan-ai-editorial-agent-mvp.md, Phase 4.
    status: "draft" as const,
    published_at: publishedAt,
  };

  try {
    const existingPostId: string | null = draftRow.post_id;
    let finalSlug: string;
    let postId: string;
    let oldSlug: string | null = null;

    if (existingPostId) {
      const { data: existing } = await supabase
        .from("posts")
        .select("slug")
        .eq("id", existingPostId)
        .maybeSingle();
      oldSlug = existing?.slug ?? null;
      postId = existingPostId;

      finalSlug = await withUniqueSlug(baseSlug, async (slug) => {
        return await supabase
          .from("posts")
          .update({ ...postFields, slug })
          .eq("id", existingPostId)
          .select("id")
          .single();
      });
    } else {
      let insertedId = "";
      finalSlug = await withUniqueSlug(baseSlug, async (slug) => {
        // `author`/`has_comments` are DB-defaulted columns the hand-maintained
        // Insert type doesn't mark optional — same gap `articulos/new.astro`
        // already works around with the same cast.
        const res = await supabase
          .from("posts")
          .insert({ ...postFields, slug } as never)
          .select("id")
          .single();
        if (res.data) insertedId = res.data.id;
        return res;
      });
      postId = insertedId;
    }

    // The sole writer of 'scheduled': reached only after the `posts` write
    // above already succeeded, so a piece can never say "scheduled" without a
    // real post behind it.
    const { error: linkError } = await supabase
      .from("editorial_channel_drafts")
      .update({ post_id: postId, status: "scheduled" })
      .eq("id", draftRow.id);

    if (linkError) {
      // The post exists and is real, but the draft row doesn't know it yet.
      // Surfacing this distinctly matters: silently returning ok:true would
      // hide that a retry from the wizard could create a SECOND post, since
      // `post_id` here is still null.
      console.error("publish-post: posts row written but draft link failed:", linkError);
      return json(
        {
          error:
            "El artículo se ha publicado, pero no se ha podido enlazar con esta pieza. Revísalo en Artículos antes de volver a intentarlo.",
        },
        500,
      );
    }

    const tags = new Set(["listings", `articulo-${finalSlug}`]);
    if (oldSlug && oldSlug !== finalSlug) tags.add(`articulo-${oldSlug}`);
    await purgeTags([...tags]);

    return json({ ok: true, slug: finalSlug, postId });
  } catch (err) {
    console.error("publish-post error:", err);
    return json({ error: "No se ha podido publicar el artículo." }, 500);
  }
};

/**
 * Runs `attempt` with `baseSlug`, and on a unique-constraint violation (Postgres
 * `23505`), retries with `-2`, `-3`… until one lands or the attempts run out.
 * Any other error is rethrown as-is.
 *
 * Works unmodified for both insert and update: updating a row to its OWN
 * unchanged slug never raises `23505` against itself, so the same loop covers
 * "brand new post" and "same post, slug untouched" without telling them apart.
 */
async function withUniqueSlug(
  baseSlug: string,
  attempt: (slug: string) => Promise<{ error: { code?: string; message?: string } | null }>,
): Promise<string> {
  for (let n = 1; n <= MAX_SLUG_ATTEMPTS; n++) {
    const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`;
    const { error } = await attempt(slug);
    if (!error) return slug;
    if (error.code !== "23505") throw new Error(error.message || "Error al guardar el artículo.");
  }
  throw new Error("No se ha encontrado una URL libre para el artículo.");
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
