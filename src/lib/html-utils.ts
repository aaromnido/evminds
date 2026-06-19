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
