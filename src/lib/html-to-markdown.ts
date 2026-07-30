/**
 * HTML → Markdown, the return trip of `markdown.ts` (task A3, step ③).
 *
 * **Why a round trip is safe here, when it usually isn't.** Converting between
 * two formats normally loses whatever one of them cannot express. What makes it
 * lossless in this screen is that the set of elements is small and *closed*:
 * paragraphs, H2/H3, bold, italic, inline code, links, lists, blockquotes and
 * images. That is exactly what `markdownToHtml` produces, exactly what TipTap's
 * StarterKit + Image extension produce, and exactly what this reads back.
 * Nothing outside the set can appear, so nothing outside the set can be lost.
 *
 * If the visual editor ever grows a feature this does not know about (tables,
 * footnotes), it has to be added here **in the same commit** or it will
 * silently vanish the next time the text is edited.
 *
 * Browser only: it parses with `DOMParser`, which is how it stays a reader of
 * real markup instead of a pile of regexes. It runs inside a hydrated island, so
 * that is fine; on the server it returns the input untouched rather than
 * throwing.
 */

const HEADING = /^H([1-6])$/;

/** Marks that wrap inline content, by tag. */
const INLINE_WRAP: Record<string, string> = {
  STRONG: "**",
  B: "**",
  EM: "*",
  I: "*",
  CODE: "`",
};

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const children = Array.from(el.childNodes).map(inline).join("");

  if (el.tagName === "BR") return "\n";
  if (el.tagName === "A") {
    const href = el.getAttribute("href")?.trim();
    return href ? `[${children}](${href})` : children;
  }

  const wrap = INLINE_WRAP[el.tagName];
  // Empty marks would render as literal asterisks, so they are dropped.
  return wrap && children.trim() ? `${wrap}${children}${wrap}` : children;
}

function listBlock(el: Element, ordered: boolean): string {
  return Array.from(el.children)
    .filter((child) => child.tagName === "LI")
    .map((li, i) => `${ordered ? `${i + 1}.` : "-"} ${inline(li).trim()}`)
    .join("\n");
}

function block(el: Element): string {
  if (el.tagName === "IMG") {
    const src = el.getAttribute("src")?.trim();
    if (!src) return "";
    return `![${el.getAttribute("alt")?.trim() ?? ""}](${src})`;
  }

  const heading = HEADING.exec(el.tagName);
  if (heading) return `${"#".repeat(Number(heading[1]))} ${inline(el).trim()}`;

  if (el.tagName === "UL") return listBlock(el, false);
  if (el.tagName === "OL") return listBlock(el, true);

  if (el.tagName === "BLOCKQUOTE") {
    return inline(el)
      .trim()
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (el.tagName === "PRE") return inline(el).trim();

  return inline(el).trim();
}

export function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  return Array.from(doc.body.children)
    .map((el) => block(el))
    .filter((text) => text.trim())
    .join("\n\n");
}
