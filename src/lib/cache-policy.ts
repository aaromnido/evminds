/**
 * Cache decision engine for the public site — pure function so it's unit
 * testable without an Astro request. `src/middleware.ts` calls it and applies
 * the returned headers to the response; it does not read cookies/URL itself.
 *
 * Route→policy map, TTLs and bypass rules mirror
 * `.claude/docs/cache-strategy.md` and `.claude/tasks/cache-edge-caching-netlify.md`
 * (Cache map & TTLs table) — keep the two in sync if either changes.
 *
 * Default-deny: any route not explicitly matched below returns `null` (no
 * headers), which is today's uncached behavior — a forgotten route ships
 * uncached, never accidentally cached.
 *
 * `Netlify-Vary` (cookie-based cache key variation): Netlify caches by
 * path+query only, not by cookie, so a cookie-bypassed response is only safe
 * from a stale-content leak if the FIRST cached entry for that URL declares
 * `Netlify-Vary: cookie=<name>` — Netlify locks in whichever `Netlify-Vary` the
 * first-cached response for a URL carries and ignores later ones, so the
 * cacheable AND the bypass response for a cookie-sensitive route must emit the
 * identical `Netlify-Vary` value. Confirmed against Netlify's docs
 * (docs.netlify.com/build/caching/caching-overview) after discovering in Phase
 * 8 that the plan's original "just withhold cache headers on bypass" approach
 * doesn't stop the edge serving an already-cached anonymous/pre-auth response
 * to a cookie-bearing request — see the Phase 8 deviation note in the task doc.
 */

export interface CacheDecisionInput {
  pathname: string;
  hasPrefsCookie: boolean;
  hasAuthCookie: boolean;
  isPreview: boolean;
  /** e.g. "sb-<project-ref>-auth-token" — env-derived so this module stays pure/testable. */
  authCookieBaseName: string;
}

export interface CacheHeaders {
  "Netlify-CDN-Cache-Control"?: string;
  "Cache-Control"?: string;
  "Netlify-Cache-Tag"?: string;
  "Netlify-Vary"?: string;
}

// Long edge TTL, short browser TTL: a purge only reaches the CDN, never
// browsers, so the browser header must revalidate on (almost) every request.
const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";

// `query,` is explicit even though it's Netlify's documented default for
// serverless functions — the docs don't confirm whether declaring
// `Netlify-Vary` for one dimension (cookie) silently drops that default, and
// getting this wrong would silently break the `?source`/`?cursor` cache-key
// requirement. Explicit costs nothing and matches Netlify's own combine syntax.
const PREFS_VARY = "query,cookie=evminds-prefs";

// Supabase's auth cookie can chunk into numbered parts for long JWTs
// (`sb-<ref>-auth-token.0`, `.1`, ...) — `Netlify-Vary` needs exact cookie
// names (no wildcards), so this lists the base name plus the first two chunk
// indices. Covers the observed range in practice; an admin whose token chunks
// further would (rarely) still see a stale "no edit button" state until the
// page is purged or its TTL expires — accepted, no security impact (the admin
// only misses a UI affordance, never sees content they shouldn't).
function authVary(baseName: string): string {
  return `query,cookie=${baseName}|${baseName}.0|${baseName}.1`;
}

function listingsHeaders(): CacheHeaders {
  return {
    "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    "Cache-Control": BROWSER_CACHE_CONTROL,
    "Netlify-Cache-Tag": "listings",
  };
}

// No `immutable`: a single failed purge on an immutable page would freeze it
// indefinitely. 1 year + purge-on-edit behaves like "indefinite" without that trap.
function detailHeaders(tag: string): CacheHeaders {
  return {
    "Netlify-CDN-Cache-Control": "public, s-maxage=31536000",
    "Cache-Control": BROWSER_CACHE_CONTROL,
    "Netlify-Cache-Tag": tag,
  };
}

function feedsHeaders(): CacheHeaders {
  return {
    "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
    "Cache-Control": BROWSER_CACHE_CONTROL,
    "Netlify-Cache-Tag": "feeds",
  };
}

export function decideCacheHeaders(input: CacheDecisionInput): CacheHeaders | null {
  const { pathname } = input;

  // Group A — personalized listings: bypass when the prefs cookie is present.
  // Netlify-Vary must be identical on the cacheable AND bypass paths (see the
  // module docblock) — otherwise whichever response gets cached first for a
  // given URL "wins" and the other case silently loses its bypass protection.
  if (
    pathname === "/" ||
    pathname === "/videos" ||
    pathname === "/api/articles" ||
    /^\/categoria\/[^/]+$/.test(pathname)
  ) {
    if (input.hasPrefsCookie) return { "Netlify-Vary": PREFS_VARY };
    return { ...listingsHeaders(), "Netlify-Vary": PREFS_VARY };
  }

  // Group A' — global listings, no personalization cookie involved.
  if (pathname === "/articulos" || pathname === "/medios-de-confianza") {
    return listingsHeaders();
  }

  // Group B — editable detail: bypass when an admin session cookie is present
  // (renders the "edit" button). News slugs are immutable, so one tag suffices.
  const noticiaMatch = /^\/noticia\/([^/]+)$/.exec(pathname);
  if (noticiaMatch) {
    const vary = authVary(input.authCookieBaseName);
    if (input.hasAuthCookie) return { "Netlify-Vary": vary };
    return { ...detailHeaders(`noticia-${noticiaMatch[1]}`), "Netlify-Vary": vary };
  }

  // Own-article detail: bypass on the auth cookie OR `?preview`. `?preview` is
  // already a distinct cache key (query is always part of it here), so it
  // never collides with the clean URL's cache entry — no Netlify-Vary needed
  // for that case, since nothing about the `?preview` response is ever cached.
  const articuloMatch = /^\/articulo\/([^/]+)$/.exec(pathname);
  if (articuloMatch) {
    if (input.isPreview) return null;
    const vary = authVary(input.authCookieBaseName);
    if (input.hasAuthCookie) return { "Netlify-Vary": vary };
    return { ...detailHeaders(`articulo-${articuloMatch[1]}`), "Netlify-Vary": vary };
  }

  // Group B' — video detail: no admin edit route exists, so no bypass, no Vary needed.
  const videoMatch = /^\/video\/([^/]+)$/.exec(pathname);
  if (videoMatch) {
    return detailHeaders(`video-${videoMatch[1]}`);
  }

  // Group D — feeds.
  if (pathname === "/rss.xml" || pathname === "/sitemap-news.xml") {
    return feedsHeaders();
  }

  // Default-deny: /admin/* (gated earlier in the middleware anyway),
  // /api/comments-sync, /api/search, prerendered Group C statics (never reach
  // this on-demand path), and anything else not explicitly listed above.
  return null;
}
