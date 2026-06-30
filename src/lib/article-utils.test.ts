import { describe, it, expect } from "vitest";
import {
  normalizeArticle,
  normalizeArticles,
  mapArticleToProps,
  isDeletableArchived,
  serializeBookmarkData,
  getAvailableCategorySlugs,
  ARCHIVED_DELETE_MIN_AGE_DAYS,
} from "./article-utils";

const rawRow = {
  id: "a1",
  slug: "tesla-news",
  title: "Original title",
  seo_title: "SEO title",
  excerpt: "An excerpt",
  image_url: "https://cdn/img.webp",
  article_url: "https://source/article",
  category: "Coches eléctricos",
  content_type: "news",
  youtube_video_id: null,
  published_at: "2026-01-20T10:30:00Z",
  scraped_at: "2026-01-21T08:00:00Z",
  source: { name: "Source A", url: "https://source" },
};

describe("normalizeArticle", () => {
  it("normalizes a raw row into ArticleData with parsed dates", () => {
    const a = normalizeArticle(rawRow);
    expect(a.id).toBe("a1");
    expect(a.source_name).toBe("Source A");
    expect(a.source_url).toBe("https://source");
    expect(a.published_at).toBeInstanceOf(Date);
    expect(a.published_at.toISOString()).toBe("2026-01-20T10:30:00.000Z");
  });

  it("unwraps source when Supabase returns it as an array", () => {
    const a = normalizeArticle({ ...rawRow, source: [{ name: "Arr", url: "https://arr" }] });
    expect(a.source_name).toBe("Arr");
  });

  it("defaults content_type to 'news' when missing", () => {
    const a = normalizeArticle({ ...rawRow, content_type: null });
    expect(a.content_type).toBe("news");
  });

  it("defaults seo_title to null when absent", () => {
    const { seo_title, ...rest } = rawRow;
    expect(normalizeArticle(rest).seo_title).toBeNull();
  });
});

describe("normalizeArticles", () => {
  it("maps an array of rows", () => {
    expect(normalizeArticles([rawRow, rawRow])).toHaveLength(2);
  });

  it("returns an empty array for null input", () => {
    expect(normalizeArticles(null)).toEqual([]);
  });
});

describe("mapArticleToProps", () => {
  it("prefers seo_title over title for the public headline", () => {
    expect(mapArticleToProps(normalizeArticle(rawRow)).title).toBe("SEO title");
  });

  it("falls back to the original title when seo_title is null", () => {
    const props = mapArticleToProps(normalizeArticle({ ...rawRow, seo_title: null }));
    expect(props.title).toBe("Original title");
  });

  it("falls back to the placeholder image when image_url is null", () => {
    const props = mapArticleToProps(normalizeArticle({ ...rawRow, image_url: null }));
    expect(props.image).toBe("/images/placeholder-image.webp");
  });

  it("builds the news detail href from the slug", () => {
    expect(mapArticleToProps(normalizeArticle(rawRow)).href).toBe("/noticia/tesla-news");
  });

  it("builds the video href for video content type", () => {
    const props = mapArticleToProps(normalizeArticle({ ...rawRow, content_type: "video" }));
    expect(props.href).toBe("/video/tesla-news");
  });
});

describe("isDeletableArchived", () => {
  it("returns false for a non-archived item", () => {
    expect(isDeletableArchived({ archived: false, published_at: "2000-01-01" })).toBe(false);
  });

  it("returns false for an archived item younger than the min age", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - (ARCHIVED_DELETE_MIN_AGE_DAYS - 1));
    expect(isDeletableArchived({ archived: true, published_at: recent.toISOString() })).toBe(false);
  });

  it("returns true for an archived item older than the min age", () => {
    const old = new Date();
    old.setDate(old.getDate() - (ARCHIVED_DELETE_MIN_AGE_DAYS + 1));
    expect(isDeletableArchived({ archived: true, published_at: old.toISOString() })).toBe(true);
  });
});

describe("getAvailableCategorySlugs", () => {
  it("returns unique, valid slugs mapped from category names", () => {
    const rows = [
      { category: "Coches eléctricos" },
      { category: "Coches eléctricos" }, // duplicate → deduped
      { category: "Renovables" },
    ];
    expect(getAvailableCategorySlugs(rows).sort()).toEqual(["coches-electricos", "renovables"]);
  });

  it("drops null/empty and unknown category names", () => {
    const rows = [{ category: null }, { category: "" }, { category: "Inexistente" }];
    expect(getAvailableCategorySlugs(rows)).toEqual([]);
  });

  it("returns an empty array for null input", () => {
    expect(getAvailableCategorySlugs(null)).toEqual([]);
  });
});

describe("serializeBookmarkData", () => {
  it("returns an empty string when id is missing", () => {
    expect(
      serializeBookmarkData({
        title: "t",
        excerpt: "e",
        image: "i",
        source: "s",
        category: "c",
      }),
    ).toBe("");
  });

  it("serializes a JSON string and strips HTML from the excerpt", () => {
    const json = serializeBookmarkData({
      id: "x1",
      title: "Title",
      excerpt: "<p>Hola <b>mundo</b></p>",
      image: "https://img",
      source: "Source",
      category: "Cat",
    });
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("x1");
    expect(parsed.excerpt).toBe("Hola mundo");
    expect(parsed.content_type).toBe("news");
  });
});
