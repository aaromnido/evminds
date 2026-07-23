import { describe, it, expect } from "vitest";
import { decideCacheHeaders, type CacheDecisionInput } from "./cache-policy";

const BASE: CacheDecisionInput = {
  pathname: "/",
  hasPrefsCookie: false,
  hasAuthCookie: false,
  isPreview: false,
};

const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const LISTINGS_EDGE = "public, s-maxage=86400, stale-while-revalidate=86400";
const DETAIL_EDGE = "public, s-maxage=31536000";
const FEEDS_EDGE = "public, s-maxage=3600, stale-while-revalidate=3600";

describe("decideCacheHeaders — Group A (personalized listings)", () => {
  it.each(["/", "/videos", "/api/articles", "/categoria/renovables"])(
    "caches %s with the listings tag when no prefs cookie is present",
    (pathname) => {
      const headers = decideCacheHeaders({ ...BASE, pathname });
      expect(headers).toEqual({
        "Netlify-CDN-Cache-Control": LISTINGS_EDGE,
        "Cache-Control": BROWSER_CACHE_CONTROL,
        "Netlify-Cache-Tag": "listings",
      });
    },
  );

  it.each(["/", "/videos", "/api/articles", "/categoria/renovables"])(
    "bypasses %s (returns null) when the prefs cookie is present",
    (pathname) => {
      expect(decideCacheHeaders({ ...BASE, pathname, hasPrefsCookie: true })).toBeNull();
    },
  );
});

describe("decideCacheHeaders — Group A' (global listings, no personalization)", () => {
  it.each(["/articulos", "/medios-de-confianza"])(
    "caches %s with the listings tag regardless of the prefs cookie",
    (pathname) => {
      const headers = decideCacheHeaders({ ...BASE, pathname, hasPrefsCookie: true });
      expect(headers).toEqual({
        "Netlify-CDN-Cache-Control": LISTINGS_EDGE,
        "Cache-Control": BROWSER_CACHE_CONTROL,
        "Netlify-Cache-Tag": "listings",
      });
    },
  );
});

describe("decideCacheHeaders — Group B (/noticia/[slug])", () => {
  it("caches with a per-slug tag when no auth cookie is present", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/noticia/some-slug" });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": DETAIL_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "noticia-some-slug",
    });
  });

  it("never sets immutable on the edge header", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/noticia/some-slug" });
    expect(headers?.["Netlify-CDN-Cache-Control"]).not.toContain("immutable");
  });

  it("bypasses (returns null) when the auth cookie is present", () => {
    expect(
      decideCacheHeaders({ ...BASE, pathname: "/noticia/some-slug", hasAuthCookie: true }),
    ).toBeNull();
  });
});

describe("decideCacheHeaders — /articulo/[slug]", () => {
  it("caches with a per-slug tag when no auth cookie and no ?preview", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/articulo/some-slug" });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": DETAIL_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "articulo-some-slug",
    });
  });

  it("bypasses when the auth cookie is present", () => {
    expect(
      decideCacheHeaders({ ...BASE, pathname: "/articulo/some-slug", hasAuthCookie: true }),
    ).toBeNull();
  });

  it("bypasses when ?preview is present, even without an auth cookie", () => {
    expect(
      decideCacheHeaders({ ...BASE, pathname: "/articulo/some-slug", isPreview: true }),
    ).toBeNull();
  });

  it("bypasses when both the auth cookie and ?preview are present", () => {
    expect(
      decideCacheHeaders({
        ...BASE,
        pathname: "/articulo/some-slug",
        hasAuthCookie: true,
        isPreview: true,
      }),
    ).toBeNull();
  });
});

describe("decideCacheHeaders — /video/[slug]", () => {
  it("always caches (no bypass exists for videos)", () => {
    const headers = decideCacheHeaders({
      ...BASE,
      pathname: "/video/some-slug",
      hasAuthCookie: true,
      hasPrefsCookie: true,
      isPreview: true,
    });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": DETAIL_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "video-some-slug",
    });
  });
});

describe("decideCacheHeaders — Group D (feeds)", () => {
  it.each(["/rss.xml", "/sitemap-news.xml"])("caches %s with the feeds tag", (pathname) => {
    const headers = decideCacheHeaders({ ...BASE, pathname });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": FEEDS_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "feeds",
    });
  });
});

describe("decideCacheHeaders — default-deny", () => {
  it.each([
    "/admin",
    "/admin/noticias",
    "/api/comments-sync",
    "/api/search",
    "/quienes-somos",
    "/contacto",
    "/some-unknown-route",
  ])("returns null for %s (unlisted route)", (pathname) => {
    expect(decideCacheHeaders({ ...BASE, pathname })).toBeNull();
  });
});
