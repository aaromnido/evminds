/**
 * Minimal Markdown → HTML converter for the editorial workspace (task A3).
 *
 * **Why a hand-rolled one.** The project has no Markdown dependency and this
 * needs to run in the browser, inside an admin island, over content we generate
 * ourselves: headings, paragraphs, emphasis, links and lists. Pulling in a full
 * parser (and its bundle) for that would be paying for a spec nobody here
 * writes. What it does NOT support, on purpose: tables, footnotes, nested
 * lists, reference links and raw HTML. Images are supported, narrowly (see
 * below).
 *
 * **Raw HTML in the source is escaped, never passed through.** The output is
 * injected with `dangerouslySetInnerHTML` in the preview, so the input is
 * treated as text plus Markdown syntax and nothing else. That is what makes it
 * safe to render whatever the AI or a paste brings in.
 *
 * Images (2026-07-30): a lone `![alt](src)` line, alone in its own block (blank
 * lines around it), becomes an `<img>` — that shape is exactly what
 * `htmlToMarkdown` writes back for TipTap's Image node, so the round trip stays
 * closed. Anything sharing a line with other text is not treated as an image;
 * write it on its own paragraph.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only http(s) and relative links survive, so `javascript:` URLs cannot ride in. */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return escapeHtml(trimmed);
  }
  return null;
}

/** Emphasis, code and links inside an already-escaped line. */
function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, url: string) => {
      const href = safeHref(url);
      // Always a new tab, never in place. Inside the admin, following a link
      // would throw you out of the panel mid-edit; and in the published piece,
      // it would take the reader out of the article. `noreferrer noopener` comes
      // with it because a `_blank` without it hands the opened page a handle on
      // this one.
      return href
        ? `<a href="${href}" target="_blank" rel="noreferrer noopener">${label}</a>`
        : whole;
    });
}

function listItems(lines: string[], marker: RegExp): string {
  return lines.map((line) => `<li>${inline(line.replace(marker, "").trim())}</li>`).join("");
}

export function markdownToHtml(markdown: string): string {
  const blocks = escapeHtml(markdown.trim()).split(/\n{2,}/);

  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      if (!lines.length) return "";

      if (lines.length === 1) {
        const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(lines[0].trim());
        if (image) {
          const [, alt, url] = image;
          const src = safeHref(url);
          return src ? `<img src="${src}" alt="${alt}">` : "";
        }
      }

      const heading = /^(#{1,4})\s+(.*)$/.exec(lines[0]);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${inline(heading[2].trim())}</h${level}>`;
      }

      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return `<ul>${listItems(lines, /^\s*[-*]\s+/)}</ul>`;
      }

      if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
        return `<ol>${listItems(lines, /^\s*\d+\.\s+/)}</ol>`;
      }

      if (lines.every((l) => /^\s*&gt;\s?/.test(l))) {
        const quoted = lines.map((l) => l.replace(/^\s*&gt;\s?/, "")).join(" ");
        return `<blockquote><p>${inline(quoted)}</p></blockquote>`;
      }

      // A single newline inside a paragraph is a soft break, as in Markdown.
      return `<p>${inline(lines.join("<br />"))}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
