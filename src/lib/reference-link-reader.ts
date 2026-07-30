/**
 * R1: fetch a reference link and extract its readable text.
 *
 * Plain fetch + HTML-to-text, no library and no AI — this isn't a Gemini call,
 * so it lives as a regular Node/Astro module rather than a Supabase Edge
 * Function, and is shared as-is by the "read on add" UI feedback
 * (`read-link.ts`) and by the redactor proxy's fresh re-fetch at generate
 * time (`generate-draft.ts`) — see that file for why it re-fetches instead of
 * carrying content from step ② through to generation.
 *
 * Best-effort by design: a paywalled or JS-rendered page fails the same way a
 * real reader would hit a wall, and the UI already offers "Reintentar".
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_CONTENT_CHARS = 6000;
const MIN_CONTENT_CHARS = 200;
const UNREADABLE_ERROR =
  "La página no ha dejado leer el contenido (muro de pago o carga por JavaScript).";

export type ReadLinkResult =
  { ok: true; title: string; content: string } | { ok: false; error: string };

function isFetchableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const STRIP_BLOCK_TAGS = /<(script|style|nav|header|footer|aside|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const TITLE_TAG = /<title[^>]*>([\s\S]*?)<\/title>/i;
// Closing block-level tags become a newline before the rest are stripped, so
// paragraph structure survives roughly instead of every tag boundary vanishing.
const BLOCK_BREAK = /<\/(p|div|li|h[1-6]|br|tr|section|article)\b[^>]*>/gi;
const ANY_TAG = /<[^>]+>/g;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function extractText(html: string): { title: string; text: string } {
  const titleMatch = html.match(TITLE_TAG);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : "";

  const withoutNoise = html.replace(HTML_COMMENT, "").replace(STRIP_BLOCK_TAGS, "");
  const withBreaks = withoutNoise.replace(BLOCK_BREAK, "\n");
  const stripped = decodeEntities(withBreaks.replace(ANY_TAG, " "));
  const text = stripped
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { title, text };
}

export async function readReferenceLink(url: string): Promise<ReadLinkResult> {
  if (!isFetchableUrl(url)) return { ok: false, error: "Enlace no válido." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EVmindsBot/1.0; +https://evminds.es)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return { ok: false, error: UNREADABLE_ERROR };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return { ok: false, error: UNREADABLE_ERROR };

    const html = await res.text();
    const { title, text } = extractText(html);
    if (text.length < MIN_CONTENT_CHARS) return { ok: false, error: UNREADABLE_ERROR };

    return { ok: true, title: title || url, content: text.slice(0, MAX_CONTENT_CHARS) };
  } catch {
    return { ok: false, error: UNREADABLE_ERROR };
  } finally {
    clearTimeout(timeout);
  }
}
