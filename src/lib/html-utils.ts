import sanitizeHtml from "sanitize-html";

/**
 * Strip HTML tags and decode the most common entities to plain text.
 *
 * The admin rich-text editor stores excerpts/summaries as HTML (`<p>…</p>`,
 * `<strong>`, `<a>`, …). That markup is rendered as-is where the field is shown
 * visually, but it must NOT leak into plain-text contexts: meta/og descriptions,
 * RSS `description`, the search haystack, or bookmark data. Use this there.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Defensive allowlist of safe formatting tags for the news/video excerpt.
 * The excerpt is populated by the scraper (rss-parser / youtube-parser), which
 * already strips tags at ingestion; this allowlist is the render-side safety net
 * in case any markup slips through a source layer. Covers safe inline formatting
 * (paragraphs, bold/italic, links, lists, headings, images) and drops everything
 * else.
 */
const EXCERPT_ALLOWED_TAGS: string[] = [
  "p",
  "h2",
  "h3",
  "strong",
  "em",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "br",
  "hr",
];

const EXCERPT_ALLOWED_ATTRIBUTES: Record<string, sanitizeHtml.AllowedAttribute[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "loading"],
};

const EXCERPT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: EXCERPT_ALLOWED_TAGS,
  allowedAttributes: EXCERPT_ALLOWED_ATTRIBUTES,
  // Restrict URL schemes: no javascript:, no ftp/tel in excerpts.
  allowedSchemes: ["http", "https", "mailto"],
  // Block protocol-relative URLs (//evil.com).
  allowProtocolRelative: false,
  // Harden external links: add rel="noopener noreferrer" to any <a> opening in
  // a new tab to prevent tabnabbing (the new tab can't access window.opener).
  transformTags: {
    a: (_tagName, attribs) => {
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer";
      }
      return { tagName: "a", attribs };
    },
  },
};

/**
 * Sanitize an excerpt (news/video description) for safe rendering with
 * `set:html`. The excerpt is sourced from the scraper (RSS/YouTube), which
 * already strips tags at ingestion; this is the render-side safety net that
 * drops anything outside a defensive allowlist: <script>/<iframe> (tag and
 * content), on* handlers, javascript: URLs and protocol-relative URLs.
 *
 * Defense in depth: guarantees no executable markup reaches the page even if a
 * scraper source layer fails. External links opening in a new tab get
 * rel="noopener noreferrer" to prevent tabnabbing.
 */
export function sanitizeExcerpt(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, EXCERPT_OPTIONS);
}
