import { describe, it, expect } from "vitest";
import { stripHtml, sanitizeExcerpt } from "./html-utils";

describe("stripHtml", () => {
  it("returns an empty string for null/undefined/empty", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("")).toBe("");
  });

  it("strips all HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#39;")).toBe("a&b <c> \"d\" 'e'");
  });

  it("collapses whitespace", () => {
    expect(stripHtml("<p>a</p>   <p>b</p>")).toBe("a b");
  });

  it("decodes &nbsp;", () => {
    expect(stripHtml("a&nbsp;b")).toBe("a b");
  });
});

describe("sanitizeExcerpt", () => {
  it("returns an empty string for null/undefined/empty", () => {
    expect(sanitizeExcerpt(null)).toBe("");
    expect(sanitizeExcerpt(undefined)).toBe("");
    expect(sanitizeExcerpt("")).toBe("");
  });

  it("preserves safe formatting tags", () => {
    expect(sanitizeExcerpt("<p>clean <strong>bold</strong></p>")).toBe(
      "<p>clean <strong>bold</strong></p>",
    );
  });

  it("preserves headings, lists and links", () => {
    const out = sanitizeExcerpt(
      '<h2>title</h2><ul><li>a</li><li>b</li></ul><a href="https://evminds.es">link</a>',
    );
    expect(out).toBe(
      '<h2>title</h2><ul><li>a</li><li>b</li></ul><a href="https://evminds.es">link</a>',
    );
  });

  it("drops <script> tags and their content", () => {
    expect(sanitizeExcerpt("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>");
  });

  it("drops <iframe> tags", () => {
    expect(sanitizeExcerpt("<p>hi</p><iframe src=evil></iframe>")).toBe("<p>hi</p>");
  });

  it("strips on* event handler attributes", () => {
    expect(sanitizeExcerpt('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips onerror from <img> but keeps src", () => {
    expect(sanitizeExcerpt('<img src="x" onerror="alert(1)">')).toBe('<img src="x" />');
  });

  it("drops javascript: URLs from <a href>", () => {
    expect(sanitizeExcerpt('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("blocks protocol-relative URLs", () => {
    expect(sanitizeExcerpt('<a href="//evil.com">x</a>')).toBe("<a>x</a>");
  });

  it("adds rel=noopener noreferrer to target=_blank links", () => {
    expect(sanitizeExcerpt('<a href="https://evminds.es" target="_blank">link</a>')).toBe(
      '<a href="https://evminds.es" target="_blank" rel="noopener noreferrer">link</a>',
    );
  });

  it("leaves same-tab links untouched", () => {
    expect(sanitizeExcerpt('<a href="https://evminds.es">link</a>')).toBe(
      '<a href="https://evminds.es">link</a>',
    );
  });
});
