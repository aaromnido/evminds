/**
 * Tests for purgeNetlifyTags (Netlify purge REST API call).
 *
 * Config and fetch are both passed in (never read from Deno.env / global
 * fetch), so these tests run under a bare `deno test` — no --allow-env or
 * --allow-net needed.
 */

import { assertEquals } from 'jsr:@std/assert@1/equals';
import { purgeNetlifyTags } from './netlify-purge.ts';

const VALID_CONFIG = { token: 'test-token', siteId: 'test-site-id' };

function fakeFetch(response: Response): FetchCall {
  const call: FetchCall = { called: false, url: undefined, init: undefined };
  call.fetch = (async (url: string | URL, init?: RequestInit) => {
    call.called = true;
    call.url = String(url);
    call.init = init;
    return response;
  }) as typeof fetch;
  return call;
}

interface FetchCall {
  called: boolean;
  url: string | undefined;
  init: RequestInit | undefined;
  fetch?: typeof fetch;
}

Deno.test('does nothing and never calls fetch when tags is empty', async () => {
  const call = fakeFetch(new Response(null, { status: 200 }));

  await purgeNetlifyTags([], VALID_CONFIG, call.fetch!);

  assertEquals(call.called, false);
});

Deno.test('does nothing and never calls fetch when the token is missing', async () => {
  const call = fakeFetch(new Response(null, { status: 200 }));

  await purgeNetlifyTags(['listings'], { token: undefined, siteId: 'test-site-id' }, call.fetch!);

  assertEquals(call.called, false);
});

Deno.test('does nothing and never calls fetch when the site id is missing', async () => {
  const call = fakeFetch(new Response(null, { status: 200 }));

  await purgeNetlifyTags(['listings'], { token: 'test-token', siteId: undefined }, call.fetch!);

  assertEquals(call.called, false);
});

Deno.test('calls the Netlify purge endpoint with the right method, auth and body', async () => {
  const call = fakeFetch(new Response(null, { status: 200 }));

  await purgeNetlifyTags(['listings', 'feeds'], VALID_CONFIG, call.fetch!);

  assertEquals(call.called, true);
  assertEquals(call.url, 'https://api.netlify.com/api/v1/purge');
  assertEquals(call.init?.method, 'POST');
  const headers = call.init?.headers as Record<string, string>;
  assertEquals(headers['Authorization'], 'Bearer test-token');
  assertEquals(headers['Content-Type'], 'application/json');
  assertEquals(
    call.init?.body,
    JSON.stringify({ site_id: 'test-site-id', cache_tags: ['listings', 'feeds'] }),
  );
});

Deno.test('logs and does not throw when the response is not ok', async () => {
  const call = fakeFetch(new Response('nope', { status: 500 }));

  await purgeNetlifyTags(['listings'], VALID_CONFIG, call.fetch!);

  assertEquals(call.called, true);
});

Deno.test('logs and does not throw when fetch rejects', async () => {
  const rejectingFetch = (() => Promise.reject(new Error('network down'))) as typeof fetch;

  await purgeNetlifyTags(['listings'], VALID_CONFIG, rejectingFetch);
});
