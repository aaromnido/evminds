import type { purgeCache as PurgeCacheFn } from "@netlify/functions";

type PurgeCacheFactory = typeof PurgeCacheFn;

/**
 * Purges Netlify's edge cache for the given cache tags. Errors are logged, not
 * thrown — a purge failure must never break the admin save flow it's attached to
 * (worst case: the edge serves a stale response until the TTL expires).
 *
 * `purgeCache` is lazily imported so this module stays load-safe without the
 * Netlify runtime env vars it needs (SITE_ID / NETLIFY_PURGE_API_TOKEN) — needed
 * for unit tests, which always inject a fake `purgeCache` and never reach it.
 */
export async function purgeTags(tags: string[], purgeCache?: PurgeCacheFactory): Promise<void> {
  if (tags.length === 0) return;

  const purge = purgeCache ?? (await import("@netlify/functions")).purgeCache;

  try {
    await purge({ tags });
  } catch (err) {
    console.error("[cache-purge] purgeCache failed:", err);
  }
}
