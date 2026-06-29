import { describe, it, expect } from "vitest";
import { formatSummaryParagraph, summaryToMetaDescription } from "./format-summary";

describe("formatSummaryParagraph", () => {
  it("escapes HTML special characters", () => {
    expect(formatSummaryParagraph("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("converts **bold** markers into <strong> tags", () => {
    expect(formatSummaryParagraph("plain **bold** plain")).toBe(
      "plain <strong>bold</strong> plain",
    );
  });

  it("escapes a stray <script> tag instead of preserving it", () => {
    expect(formatSummaryParagraph("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("leaves text without markers untouched (escaped)", () => {
    expect(formatSummaryParagraph("No markers here")).toBe("No markers here");
  });

  it("handles multiple bold spans in one paragraph", () => {
    expect(formatSummaryParagraph("**a** x **b** y **c**")).toBe(
      "<strong>a</strong> x <strong>b</strong> y <strong>c</strong>",
    );
  });
});

describe("summaryToMetaDescription", () => {
  it("strips bold markers into plain text", () => {
    expect(summaryToMetaDescription("**bold** word")).toBe("bold word");
  });

  it("collapses whitespace including paragraph breaks", () => {
    expect(summaryToMetaDescription("para1\n\npara2\n\npara3")).toBe("para1 para2 para3");
  });

  it("truncates at a word boundary and appends an ellipsis when cut", () => {
    const long = "word ".repeat(40).trim(); // ~199 chars
    const out = summaryToMetaDescription(long, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51); // cut word + ellipsis
    expect(out).not.toMatch(/\s+…$/); // no trailing space before ellipsis
  });

  it("returns the full string when under the limit", () => {
    expect(summaryToMetaDescription("short", 160)).toBe("short");
  });

  it("trims trailing punctuation before the ellipsis", () => {
    const long = "word ".repeat(40).trim();
    const out = summaryToMetaDescription(long + ", ", 50);
    expect(out.endsWith(",…")).toBe(false);
  });
});
