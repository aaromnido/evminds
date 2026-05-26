/**
 * Nivel A test: exercises cacheImage() in isolation against the real
 * Cloudinary API. Uploads a synthetic public image under a `test-<uuid>`
 * public_id so the result is easy to filter and delete from the Media Library.
 *
 * Run:
 *   deno run --allow-net --allow-env --env-file=.env.local scripts/test-cache-image.ts
 *
 * Cleanup: in Cloudinary Dashboard, filter by `test-` and delete.
 */

import { cacheImage } from '../supabase/functions/scrape/services/image-cache.ts';

const testUrl = 'https://placehold.co/1200x630/png';
const testArticleId = `test-${crypto.randomUUID()}`;

console.log('▶ Input URL :', testUrl);
console.log('▶ public_id :', testArticleId);
console.log('');

const result = await cacheImage(testUrl, testArticleId);

console.log('');
console.log('◀ Result URL:', result);

const expectedPrefix = `https://res.cloudinary.com/${
  Deno.env.get('PUBLIC_CLOUDINARY_CLOUD') ?? '<cloud>'
}/image/upload/`;
console.log('◀ Expected prefix:', expectedPrefix);

if (result && result.startsWith(expectedPrefix)) {
  console.log('\n✓ PASS — upload succeeded');
  Deno.exit(0);
} else {
  console.log('\n✗ FAIL — result does not match Cloudinary upload prefix');
  Deno.exit(1);
}
