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
