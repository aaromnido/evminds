import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml images", () => {
  it("converts a standalone image line to an img tag", () => {
    const html = markdownToHtml("![Un Kia e-Niro cargando](https://example.com/coche.webp)");
    expect(html).toBe('<img src="https://example.com/coche.webp" alt="Un Kia e-Niro cargando">');
  });

  it("keeps images and paragraphs as separate blocks", () => {
    const html = markdownToHtml(
      "Primer párrafo.\n\n![alt](https://example.com/a.webp)\n\nSegundo párrafo.",
    );
    expect(html).toBe(
      '<p>Primer párrafo.</p>\n<img src="https://example.com/a.webp" alt="alt">\n<p>Segundo párrafo.</p>',
    );
  });

  it("does not treat an image reference sharing a line with other text as a block image", () => {
    const html = markdownToHtml("Mira esta foto ![alt](https://example.com/a.webp) del coche.");
    expect(html).toContain("<p>");
    expect(html).not.toContain("<img");
  });

  it("drops an image whose URL is not http(s)", () => {
    const html = markdownToHtml("![alt](data:text/html,evil)");
    expect(html).toBe("");
  });
});
