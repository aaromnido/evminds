/**
 * Formats an AI-generated summary paragraph for safe HTML rendering.
 *
 * Gemini is prompted to emit Markdown-style `**bold**` markers around key
 * concepts. This helper:
 *   1. HTML-escapes the entire string (defense in depth — Gemini is
 *      trusted but external data is never rendered raw).
 *   2. Converts the escaped `**...**` markers into <strong> tags.
 *
 * Result is intended for use with Astro's `set:html` directive.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatSummaryParagraph(text: string): string {
  return escapeHtml(text).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
}

/**
 * Extracts a clean meta-description-friendly string from an AI summary.
 *
 * - Strips Markdown bold markers (`**...**` → plain text)
 * - Collapses paragraph breaks into single spaces
 * - Truncates at a word boundary, appending an ellipsis when cut
 *
 * Use to feed <meta name="description">, og:description and JSON-LD
 * fields with content that is unique per article (vs. the source's
 * excerpt, which is often short and repeated across articles).
 */
export function summaryToMetaDescription(
  summary: string,
  maxLength = 160,
): string {
  const plain = summary
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const cut = plain.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const truncated = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${truncated.replace(/[.,;:!?-]+$/, "")}…`;
}
