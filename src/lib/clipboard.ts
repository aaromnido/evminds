/**
 * Copying to the clipboard, in the two flavours this panel needs.
 *
 * The distinction matters more than it looks, and it decides whether step ③ does
 * its job at all: that screen exists so its fields can be pasted into someone
 * else's CMS, and **what a rich-text box receives depends on the clipboard's MIME
 * type, not on the string**.
 *
 * - `copyPlain` writes `text/plain`. Right for every plain field, and right for
 *   the body's Markdown / HTML source views, where the source itself is what is
 *   being handed over.
 * - `copyRich` writes `text/html` **and** a plain fallback. Pasting into a
 *   WYSIWYG (the entradilla's box in Motor.es) then arrives formatted instead of
 *   as literal `<strong>` tags, which is what `text/plain` would produce.
 */

/** Plain text, exactly as given. */
export function copyPlain(text: string): void {
  void navigator.clipboard?.writeText(text);
}

/**
 * Formatted text: pastes as rich content into an editor, as `plain` anywhere
 * else.
 *
 * `ClipboardItem` is not available everywhere (and needs a secure context), so a
 * failure falls back to the plain string rather than copying nothing.
 */
export function copyRich(html: string, plain: string): void {
  const clipboard = navigator.clipboard;
  if (!clipboard) return;

  if (typeof ClipboardItem === "undefined" || !clipboard.write) {
    void clipboard.writeText(plain);
    return;
  }

  try {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    void clipboard.write([item]).catch(() => clipboard.writeText(plain));
  } catch {
    void clipboard.writeText(plain);
  }
}
