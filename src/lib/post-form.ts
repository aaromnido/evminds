import { isValidPostCategory } from "./post-categories";
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
  const publishedAtRaw = get("published_at");

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Scheduling model (ADR-006): published + future date = scheduled.
  // Published with no date = now. Draft keeps whatever date was given (or null).
  // Guard the conversion: an invalid raw value (e.g. tampered input) would throw
  // RangeError on toISOString() — leave null so validatePostForm catches it with
  // the friendly "Fecha de publicación no válida." message instead of a 500.
  let publishedAt: string | null = null;
  if (publishedAtRaw) {
    const d = new Date(publishedAtRaw);
    if (!isNaN(d.getTime())) publishedAt = d.toISOString();
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
