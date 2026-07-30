/**
 * Text transformations behind the Markdown toolbar (task A3, step ③).
 *
 * Pure functions over `(value, selection)` so the toolbar component only has to
 * read the textarea and write the result back. Keeping them here is what makes
 * them checkable without rendering anything, and it is the half that will not
 * change when the toolbar is restyled.
 */

export type MarkdownAction = "bold" | "italic" | "h2" | "h3" | "ul" | "ol" | "quote" | "link";

export interface EditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Markers that wrap the selection. */
const WRAP: Partial<Record<MarkdownAction, string>> = {
  bold: "**",
  italic: "*",
};

/** Prefixes applied to every selected line. */
const PREFIX: Partial<Record<MarkdownAction, string>> = {
  h2: "## ",
  h3: "### ",
  ul: "- ",
  ol: "1. ",
  quote: "> ",
};

function wrapSelection(value: string, start: number, end: number, marker: string): EditResult {
  const selected = value.slice(start, end);

  // Applying it twice removes it, which is what every editor does and what
  // stops the toolbar from stacking ****like this****.
  if (
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    selected.length > 2 * marker.length
  ) {
    const stripped = selected.slice(marker.length, -marker.length);
    return {
      value: value.slice(0, start) + stripped + value.slice(end),
      selectionStart: start,
      selectionEnd: start + stripped.length,
    };
  }

  const next = `${marker}${selected}${marker}`;
  return {
    value: value.slice(0, start) + next + value.slice(end),
    selectionStart: start + marker.length,
    selectionEnd: start + marker.length + selected.length,
  };
}

function prefixLines(value: string, start: number, end: number, prefix: string): EditResult {
  // Grow the selection to whole lines: a prefix only means something at the
  // start of one.
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const to = lineEnd === -1 ? value.length : lineEnd;

  const lines = value.slice(from, to).split("\n");
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const next = lines
    .map((line) => (allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`))
    .join("\n");

  return {
    value: value.slice(0, from) + next + value.slice(to),
    selectionStart: from,
    selectionEnd: from + next.length,
  };
}

function insertLink(value: string, start: number, end: number): EditResult {
  const selected = value.slice(start, end) || "texto del enlace";
  const next = `[${selected}](https://)`;
  return {
    value: value.slice(0, start) + next + value.slice(end),
    // Leaves the cursor inside the parentheses, which is where the URL goes.
    selectionStart: start + next.length - 1,
    selectionEnd: start + next.length - 1,
  };
}

export function applyMarkdownAction(
  value: string,
  start: number,
  end: number,
  action: MarkdownAction,
): EditResult {
  const marker = WRAP[action];
  if (marker) return wrapSelection(value, start, end, marker);

  const prefix = PREFIX[action];
  if (prefix) return prefixLines(value, start, end, prefix);

  return insertLink(value, start, end);
}
