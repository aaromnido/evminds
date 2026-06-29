/**
 * Cloudinary signed upload (server-side only).
 *
 * Mirrors the scraper's signing recipe
 * (supabase/functions/scrape/services/image-cache.ts): SHA-1 signature over the
 * sorted params + API secret, output normalized to webp and capped at 1200px.
 * The API secret stays on the server — never import this from a client island.
 */

const CLOUD = import.meta.env.PUBLIC_CLOUDINARY_CLOUD;
const API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

async function sha1Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Whether the Cloudinary credentials are present in the environment. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD && API_KEY && API_SECRET);
}

/**
 * Uploads an image blob to Cloudinary as a signed asset and returns its
 * secure_url. Throws on missing config or any upload error (the caller maps
 * that to an HTTP response).
 *
 * @param file   - The image bytes (e.g. a multipart File from the admin form).
 * @param folder - Cloudinary folder; public_id is auto-generated within it.
 */
export async function uploadImage(file: Blob, folder = "posts"): Promise<string> {
  if (!CLOUD || !API_KEY || !API_SECRET) {
    throw new Error("Cloudinary env vars missing");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Only these params are signed; file, api_key and resource_type are excluded
  // from the signature per Cloudinary's rules.
  const params: Record<string, string> = {
    folder,
    format: "webp",
    timestamp: String(timestamp),
    transformation: "c_limit,w_1200,q_auto",
  };

  const stringToSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = await sha1Hex(stringToSign + API_SECRET);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", API_KEY);
  formData.append("signature", signature);
  for (const [k, v] of Object.entries(params)) {
    formData.append(k, v);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errBody}`);
  }

  const result = await res.json();
  if (typeof result?.secure_url !== "string") {
    throw new Error("Cloudinary response missing secure_url");
  }

  return result.secure_url;
}
