/**
 * Filter: Discard conventional hybrid (HEV) articles.
 *
 * Rules:
 * - "híbrido enchufable" / "plug-in hybrid" / "PHEV" → KEEP
 * - "rango extendido" / "range extender" / "REEV" / "EREV" → KEEP
 * - "híbrido" (alone) / "HEV" / "mild hybrid" → DISCARD
 * - No hybrid mention at all → KEEP (not relevant to this filter)
 *
 * Whitelist (PHEV/REEV) takes priority over blacklist (HEV).
 */

const WHITELIST = [
  // Spanish
  'híbrido enchufable',
  'hibrido enchufable',
  'rango extendido',
  'autonomía extendida',
  'autonomia extendida',
  // English
  'plug-in hybrid',
  'plug in hybrid',
  'plugin hybrid',
  'range extender',
  'range-extender',
  'extended range',
  'extended-range',
  // Acronyms
  'phev',
  'reev',
  'erev',
];

const BLACKLIST = [
  // Spanish
  'híbrido',
  'hibrido',
  'microhíbrido',
  'microhibrido',
  'autorecargable',
  'auto-recargable',
  // English
  'hybrid',
  'mild hybrid',
  'mild-hybrid',
  'self-charging hybrid',
  'self charging hybrid',
  // Acronyms
  'hev',
  'mhev',
];

/**
 * Returns true if the article should be kept (is NOT a conventional hybrid).
 */
export function isNotHEV(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`.toLowerCase();

  // Whitelist wins: if PHEV/REEV terms are present, always keep
  if (WHITELIST.some(term => text.includes(term))) {
    return true;
  }

  // If blacklist matches, discard
  if (BLACKLIST.some(term => text.includes(term))) {
    return false;
  }

  // No hybrid mention → keep
  return true;
}
