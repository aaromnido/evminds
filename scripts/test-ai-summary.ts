/**
 * Nivel A test: exercises generateSummary() in isolation against the real
 * Gemini API. Uses a synthetic article with several red flags (CLTC range,
 * China launch, subsidized price) so we can verify warnings detection.
 *
 * Run:
 *   deno run --allow-net --allow-env --env-file=.env.local scripts/test-ai-summary.ts
 *
 * What to verify in the output:
 *   - summary is 5 paragraphs in Spanish (ES-ES)
 *   - paragraphs contain **bold** markers around key concepts
 *   - no em-dashes (—) used as inline separators
 *   - warnings includes at least autonomy_cltc, launch_non_european, price_subsidized
 *   - each warning has only a "type" field (no "text")
 */

import { generateSummary } from '../supabase/functions/scrape/services/ai-summary.ts';

const testTitle =
  'BYD presenta una nueva batería de estado sólido con 900 km de autonomía';

const testExcerpt =
  'BYD ha anunciado una nueva generación de baterías de estado sólido que ' +
  'promete 900 km de autonomía en ciclo CLTC y carga completa al 80% en ' +
  'apenas 5 minutos. La tecnología llegará primero al mercado chino en 2026 ' +
  'a un precio de 180.000 yuanes incluyendo las subvenciones del gobierno ' +
  'central. Para Europa no hay fecha confirmada, aunque la marca ha ' +
  'mencionado planes para 2027 o 2028.';

const testUrl = 'https://example.com/byd-solid-state-battery-test';

console.log('▶ Title  :', testTitle);
console.log('▶ Excerpt:', testExcerpt);
console.log('▶ Lang   : es');
console.log('');
console.log('Calling Gemini...');
console.log('');

const startedAt = Date.now();
const result = await generateSummary(testTitle, testExcerpt, testUrl, 'es');
const elapsedMs = Date.now() - startedAt;

console.log(`◀ Elapsed: ${elapsedMs} ms`);
console.log('');
console.log('◀ Result:');
console.log(JSON.stringify(result, null, 2));
console.log('');

// Quick sanity checks
if (!result.summary) {
  console.log('✗ FAIL — summary is null');
  Deno.exit(1);
}

const paragraphs = result.summary.split('\n\n');
const hasBold = /\*\*[^*\n]+\*\*/.test(result.summary);
const hasEmDash = /—/.test(result.summary);
const warningTypes = result.warnings.map((w) => w.type);
const everyWarningOnlyHasType = result.warnings.every(
  (w) => Object.keys(w).length === 1 && 'type' in w,
);

console.log('Sanity checks:');
console.log(`  paragraphs:           ${paragraphs.length}      ${paragraphs.length === 5 ? '✓' : '⚠ expected 5'}`);
console.log(`  contains **bold**:    ${hasBold}    ${hasBold ? '✓' : '✗'}`);
console.log(`  contains em-dash (—): ${hasEmDash}    ${hasEmDash ? '✗ should be false' : '✓'}`);
console.log(`  warnings:             ${warningTypes.length} -> [${warningTypes.join(', ')}]`);
console.log(`  warning shape clean:  ${everyWarningOnlyHasType}    ${everyWarningOnlyHasType ? '✓' : '✗ has extra fields'}`);

const allOk =
  paragraphs.length === 5 &&
  hasBold &&
  !hasEmDash &&
  everyWarningOnlyHasType &&
  result.warnings.length > 0;

Deno.exit(allOk ? 0 : 1);
