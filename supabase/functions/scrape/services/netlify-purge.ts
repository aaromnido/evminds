/**
 * Service: Netlify edge-cache purge (REST API)
 *
 * Runs at the end of a scrape to invalidate listings + feeds so new articles
 * show up without waiting for the edge TTL. This Edge Function runs on Deno
 * and cannot import `@netlify/functions` (an npm package built for the
 * Node/Netlify Function runtime), so it calls Netlify's purge REST API
 * directly instead — see `src/lib/cache-purge.ts` for the Netlify-runtime
 * counterpart used by the admin save points.
 *
 * Config (token/siteId) is passed in rather than read from `Deno.env` here,
 * so this module stays free of `Deno.env` calls and is safe to import under
 * a bare `deno test` (no `--allow-env` needed) — the caller (index.ts) reads
 * the env vars and passes them in, same as it already does for SCRAPE_SECRET.
 *
 * Errors are logged, never thrown — a purge failure must not fail the scrape.
 */

type FetchLike = typeof fetch;

export interface NetlifyPurgeConfig {
  token: string | undefined;
  siteId: string | undefined;
}

export async function purgeNetlifyTags(
  tags: string[],
  config: NetlifyPurgeConfig,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (tags.length === 0) return;

  const { token, siteId } = config;
  if (!token || !siteId) {
    console.error(
      'Netlify purge env vars missing (NETLIFY_PURGE_TOKEN / NETLIFY_SITE_ID); skipping purge',
    );
    return;
  }

  try {
    const res = await fetchImpl('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ site_id: siteId, cache_tags: tags }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Netlify purge failed (${res.status}): ${body}`);
    }
  } catch (error) {
    console.error('Netlify purge error:', error);
  }
}
