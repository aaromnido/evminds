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
 */

export interface CacheDecisionInput {
  pathname: string;
  hasPrefsCookie: boolean;
  hasAuthCookie: boolean;
  isPreview: boolean;
}

export interface CacheHeaders {
  "Netlify-CDN-Cache-Control": string;
  "Cache-Control": string;
  "Netlify-Cache-Tag": string;
}

// Long edge TTL, short browser TTL: a purge only reaches the CDN, never
// browsers, so the browser header must revalidate on (almost) every request.
const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";

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
  if (
    pathname === "/" ||
    pathname === "/videos" ||
    pathname === "/api/articles" ||
    /^\/categoria\/[^/]+$/.test(pathname)
  ) {
    return input.hasPrefsCookie ? null : listingsHeaders();
  }

  // Group A' — global listings, no personalization cookie involved.
  if (pathname === "/articulos" || pathname === "/medios-de-confianza") {
    return listingsHeaders();
  }

  // Group B — editable detail: bypass when an admin session cookie is present
  // (renders the "edit" button). News slugs are immutable, so one tag suffices.
  const noticiaMatch = /^\/noticia\/([^/]+)$/.exec(pathname);
  if (noticiaMatch) {
    return input.hasAuthCookie ? null : detailHeaders(`noticia-${noticiaMatch[1]}`);
  }

  // Own-article detail: also bypass on `?preview` — it's rendered via the
  // service-role client (RLS-bypassing), so it must never land in the edge
  // cache regardless of whether the specific article is a draft.
  const articuloMatch = /^\/articulo\/([^/]+)$/.exec(pathname);
  if (articuloMatch) {
    return input.hasAuthCookie || input.isPreview
      ? null
      : detailHeaders(`articulo-${articuloMatch[1]}`);
  }

  // Group B' — video detail: no admin edit route exists, so no bypass needed.
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
