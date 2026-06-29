import type { APIRoute } from "astro";
import { uploadImage } from "@/lib/cloudinary";

/**
 * POST /admin/posts/upload-image
 *
 * Admin-only image upload for the post editor. Lives under /admin so the
 * middleware gate (admin role + verified JWT) protects it; the editor island
 * calls it with a same-origin fetch, so the session cookie rides along.
 *
 * Body: multipart/form-data with a single `file` field.
 * Response: { url } on success, { error } with a 4xx/5xx status otherwise.
 *
 * SVG is intentionally rejected (it can carry scripts → stored XSS). The size
 * cap mirrors a sane hero-image budget; Cloudinary normalizes to webp anyway.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
// Whitelisted Cloudinary folders — never pass a client value straight through.
const ALLOWED_FOLDERS = ["posts", "news"] as const;

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const folderRaw = String(form.get("folder") ?? "posts");
    const folder = (ALLOWED_FOLDERS as readonly string[]).includes(folderRaw) ? folderRaw : "posts";

    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "No se recibió ningún archivo." }, 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: "Formato no permitido (usa JPG, PNG, WebP, GIF o AVIF)." }, 415);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "La imagen supera el máximo de 10 MB." }, 413);
    }

    const url = await uploadImage(file, folder);
    return json({ url });
  } catch (err) {
    console.error("upload-image error:", err);
    return json({ error: "No se pudo subir la imagen." }, 500);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
