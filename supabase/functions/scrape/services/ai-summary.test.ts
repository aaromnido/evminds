/**
 * Tests for the powertrain field in parseAndValidate (Fase 2 BEV-only filter).
 *
 * Covers: valid value passthrough, invalid value → undefined (fail-open),
 * missing field → undefined (fail-open), and all six valid enum values.
 */

import { assertEquals } from 'jsr:@std/assert@1/equals';
import { parseAndValidate, VALID_POWERTRAINS } from './ai-summary.ts';

// Minimal valid Gemini response that passes parseAndValidate. Only fields
// required by the schema are included; powertrain is tested in isolation.
const BASE_VALID = {
  summary: ['Párrafo uno dos tres cuatro cinco seis.', 'Segundo párrafo con suficiente texto para superar el mínimo.', 'Tercero.', 'Cuarto.', 'Quinto.'],
  warnings: [],
  discussion_prompt: '¿Qué opinas?',
  seo_title: 'Tesla Model 3, el eléctrico más vendido',
  headline_tone: 'green',
};

Deno.test('powertrain: valid value "bev" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'bev' });
  assertEquals(result?.powertrain, 'bev');
});

Deno.test('powertrain: valid value "phev" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'phev' });
  assertEquals(result?.powertrain, 'phev');
});

Deno.test('powertrain: valid value "erev" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'erev' });
  assertEquals(result?.powertrain, 'erev');
});

Deno.test('powertrain: valid value "hev" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'hev' });
  assertEquals(result?.powertrain, 'hev');
});

Deno.test('powertrain: valid value "ice" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'ice' });
  assertEquals(result?.powertrain, 'ice');
});

Deno.test('powertrain: valid value "na" passes through', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'na' });
  assertEquals(result?.powertrain, 'na');
});

Deno.test('powertrain: invalid value → undefined (fail-open)', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: 'electric' });
  assertEquals(result?.powertrain, undefined);
});

Deno.test('powertrain: missing field → undefined (fail-open)', () => {
  const result = parseAndValidate(BASE_VALID);
  assertEquals(result?.powertrain, undefined);
});

Deno.test('powertrain: null value → undefined (fail-open)', () => {
  const result = parseAndValidate({ ...BASE_VALID, powertrain: null });
  assertEquals(result?.powertrain, undefined);
});

Deno.test('VALID_POWERTRAINS contains all six expected values', () => {
  const expected = new Set(['bev', 'phev', 'erev', 'hev', 'ice', 'na']);
  assertEquals(VALID_POWERTRAINS.size, expected.size);
  for (const v of expected) {
    assertEquals(VALID_POWERTRAINS.has(v as never), true, `Missing: ${v}`);
  }
});
