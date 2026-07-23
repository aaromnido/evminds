import { describe, it, expect } from "vitest";
import { decideCacheHeaders, type CacheDecisionInput } from "./cache-policy";

const AUTH_COOKIE_BASE_NAME = "sb-test-ref-auth-token";

const BASE: CacheDecisionInput = {
  pathname: "/",
  hasPrefsCookie: false,
  hasAuthCookie: false,
  isPreview: false,
  authCookieBaseName: AUTH_COOKIE_BASE_NAME,
};

const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const LISTINGS_EDGE = "public, s-maxage=86400, stale-while-revalidate=86400";
const DETAIL_EDGE = "public, s-maxage=31536000";
const FEEDS_EDGE = "public, s-maxage=3600, stale-while-revalidate=3600";
const PREFS_VARY = "query,cookie=evminds-prefs";
const AUTH_VARY = `query,cookie=${AUTH_COOKIE_BASE_NAME}|${AUTH_COOKIE_BASE_NAME}.0|${AUTH_COOKIE_BASE_NAME}.1`;

describe("decideCacheHeaders — Group A (personalized listings)", () => {
  it.each(["/", "/videos", "/api/articles", "/categoria/renovables"])(
    "caches %s with the listings tag + Netlify-Vary when no prefs cookie is present",
    (pathname) => {
      const headers = decideCacheHeaders({ ...BASE, pathname });
      expect(headers).toEqual({
        "Netlify-CDN-Cache-Control": LISTINGS_EDGE,
        "Cache-Control": BROWSER_CACHE_CONTROL,
        "Netlify-Cache-Tag": "listings",
        "Netlify-Vary": PREFS_VARY,
      });
    },
  );

  it.each(["/", "/videos", "/api/articles", "/categoria/renovables"])(
    "bypasses %s (no cache headers) but still declares the same Netlify-Vary when the prefs cookie is present",
    (pathname) => {
      const headers = decideCacheHeaders({ ...BASE, pathname, hasPrefsCookie: true });
      expect(headers).toEqual({ "Netlify-Vary": PREFS_VARY });
    },
  );
});

describe("decideCacheHeaders — Group A' (global listings, no personalization)", () => {
  it.each(["/articulos", "/medios-de-confianza"])(
    "caches %s with the listings tag regardless of the prefs cookie, no Netlify-Vary needed",
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
  it("caches with a per-slug tag + Netlify-Vary when no auth cookie is present", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/noticia/some-slug" });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": DETAIL_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "noticia-some-slug",
      "Netlify-Vary": AUTH_VARY,
    });
  });

  it("never sets immutable on the edge header", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/noticia/some-slug" });
    expect(headers?.["Netlify-CDN-Cache-Control"]).not.toContain("immutable");
  });

  it("bypasses (no cache headers) but still declares the same Netlify-Vary when the auth cookie is present", () => {
    const headers = decideCacheHeaders({
      ...BASE,
      pathname: "/noticia/some-slug",
      hasAuthCookie: true,
    });
    expect(headers).toEqual({ "Netlify-Vary": AUTH_VARY });
  });
});

describe("decideCacheHeaders — /articulo/[slug]", () => {
  it("caches with a per-slug tag + Netlify-Vary when no auth cookie and no ?preview", () => {
    const headers = decideCacheHeaders({ ...BASE, pathname: "/articulo/some-slug" });
    expect(headers).toEqual({
      "Netlify-CDN-Cache-Control": DETAIL_EDGE,
      "Cache-Control": BROWSER_CACHE_CONTROL,
      "Netlify-Cache-Tag": "articulo-some-slug",
      "Netlify-Vary": AUTH_VARY,
    });
  });

  it("bypasses (no cache headers) but still declares the same Netlify-Vary when the auth cookie is present", () => {
    const headers = decideCacheHeaders({
      ...BASE,
      pathname: "/articulo/some-slug",
      hasAuthCookie: true,
    });
    expect(headers).toEqual({ "Netlify-Vary": AUTH_VARY });
  });

  it("bypasses with no headers at all when ?preview is present (already a distinct cache key)", () => {
    expect(
      decideCacheHeaders({ ...BASE, pathname: "/articulo/some-slug", isPreview: true }),
    ).toBeNull();
  });

  it("bypasses with no headers at all when both the auth cookie and ?preview are present", () => {
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
  it("always caches (no bypass exists for videos), no Netlify-Vary needed", () => {
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
