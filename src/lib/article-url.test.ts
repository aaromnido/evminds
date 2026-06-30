import { describe, it, expect } from "vitest";
import { getNewsUrl, getVideoUrl, getArticleUrl, getContentUrl } from "./article-url";

describe("article URL builders", () => {
  it("builds news, video and article URLs", () => {
    expect(getNewsUrl("foo")).toBe("/noticia/foo");
    expect(getVideoUrl("foo")).toBe("/video/foo");
    expect(getArticleUrl("foo")).toBe("/articulo/foo");
  });
});

describe("getContentUrl", () => {
  it("defaults to the news URL", () => {
    expect(getContentUrl("foo")).toBe("/noticia/foo");
  });

  it("routes by content type", () => {
    expect(getContentUrl("foo", "video")).toBe("/video/foo");
    expect(getContentUrl("foo", "article")).toBe("/articulo/foo");
    expect(getContentUrl("foo", "news")).toBe("/noticia/foo");
  });

  it("falls back to news for an unknown content type", () => {
    expect(getContentUrl("foo", "podcast")).toBe("/noticia/foo");
  });
});
