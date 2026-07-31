import { isValidPostCategory } from "./post-categories";
import { localToUtcIso } from "./local-time";
import type { PostFormValues } from "@/components/admin/PostEditor";

/**
 * Parsed shape of the admin post form (create + edit share the same fields).
 * `values` repopulates the editor on a failed submit; `payload` is the
 * DB-ready object (tags split into array, dates as ISO, nulls for empty).
 */
export interface ParsedPostForm {
  values: PostFormValues;
  payload: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    image_url: string | null;
    image_alt: string | null;
    status: string;
    published_at: string | null;
  };
  missingFields: string[];
}

/**
 * Parse the admin post formData into display values + a DB-ready payload.
 * Used by both `admin/posts/new.astro` and `admin/posts/[id]/edit.astro`
 * to eliminate the duplicated form-parsing logic.
 */
export function parsePostForm(form: FormData): ParsedPostForm {
  const get = (k: string) => String(form.get(k) ?? "").trim();

  const title = get("title");
  const slug = get("slug");
  const excerpt = get("excerpt");
  const content = get("content");
  const category = get("category");
  const tagsRaw = get("tags");
  const imageUrl = get("image_url");
  const imageAlt = get("image_alt");
  const status = get("status");
  // Scheduling is always on the hour (ADR-006 scheduling model matches the
  // redacción wizard's localPublishInstant, which never picks a minute
  // either) — whatever minute the user typed or the picker defaulted to is
  // discarded here, before it ever reaches the DB.
  const publishedAtRaw = get("published_at").replace(/^(\d{4}-\d{2}-\d{2}T\d{2}):\d{2}/, "$1:00");

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Scheduling model (ADR-006): published + future date = scheduled.
  // Published with no date = now. Draft keeps whatever date was given (or null).
  // The datetime-local input is timezone-naive local wall-clock time (that's
  // what the edit form shows and what the user picked), so it must go through
  // localToUtcIso rather than a bare `new Date()` — the latter parses it
  // in the server process's own timezone (UTC on Netlify), silently shifting
  // the published time by the local offset (1-2h depending on DST).
  // Guard the conversion: an invalid raw value (e.g. tampered input) would
  // throw — leave null so validatePostForm catches it with the friendly
  // "Fecha de publicación no válida." message instead of a 500.
  let publishedAt: string | null = null;
  if (publishedAtRaw) {
    try {
      publishedAt = localToUtcIso(publishedAtRaw);
    } catch {
      publishedAt = null;
    }
  } else if (status === "published") {
    publishedAt = new Date().toISOString();
  }

  // Content is HTML; an empty rich-text editor yields "<p></p>".
  const emptyContent = !content || content === "<p></p>";
  const missingFields: string[] = [];
  if (!title) missingFields.push("título");
  if (!slug) missingFields.push("slug");
  if (!excerpt) missingFields.push("extracto");
  if (emptyContent) missingFields.push("contenido");

  return {
    values: {
      title,
      slug,
      excerpt,
      content,
      category,
      tags: tagsRaw,
      image_url: imageUrl,
      image_alt: imageAlt,
      status,
      published_at: publishedAtRaw,
    },
    payload: {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      image_url: imageUrl || null,
      image_alt: imageAlt || null,
      status,
      published_at: publishedAt,
    },
    missingFields,
  };
}

/**
 * Validate a parsed post form. Returns a Spanish error message for the user,
 * or `null` when the form is valid and the payload can be inserted/updated.
 */
export function validatePostForm(parsed: ParsedPostForm): string | null {
  if (parsed.missingFields.length) {
    return `Faltan campos obligatorios: ${parsed.missingFields.join(", ")}.`;
  }
  if (parsed.payload.category && !isValidPostCategory(parsed.payload.category)) {
    return "Categoría no válida.";
  }
  const raw = parsed.values.published_at;
  if (raw && isNaN(new Date(raw).getTime())) {
    return "Fecha de publicación no válida.";
  }
  return null;
}
