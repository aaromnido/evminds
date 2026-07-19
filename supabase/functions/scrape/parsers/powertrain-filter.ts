/**
 * Filter: Discard non-BEV articles (hybrids, PHEV, EREV, ICE).
 *
 * evminds publishes only pure battery electric vehicle (BEV) news.
 * This filter removes articles about other powertrains before they
 * reach the AI summarization step.
 *
 * Rules:
 * - HEV / mild hybrid / híbrido → DISCARD
 * - PHEV / híbrido enchufable / plug-in hybrid → DISCARD
 * - EREV / REEV / range extender → DISCARD
 * - ICE signals (l/100 km, mpg, e-fuel, etc.) → DISCARD
 * - No powertrain mention → KEEP (AI layer catches stealth cases)
 *
 * Matching strategy:
 * - Short terms / acronyms (hev, phev, erev, reev, mpg, …) use regex \b
 *   word boundaries with optional plural (s?) to avoid substring false
 *   positives (e.g. "hev" inside "chevrolet", "mpg" inside "mpge") while
 *   still catching industry headlines like "las ventas de PHEVs".
 * - Multi-word terms use simple includes().
 * - NBSP, common in Spanish RSS around units ("3,6 l/100 km"), is
 *   normalized to a plain space before matching.
 *
 * Ambiguous terms deliberately EXCLUDED from the blacklist:
 * - "rango extendido", "autonomía extendida", "extended range" — these are
 *   also battery variant names for BEV (Ford Mustang Mach-E, F-150 Lightning).
 *   Stealth EREV using only those terms are delegated to the AI layer.
 */

/** Terms that need \b word-boundary matching (short / acronyms). */
const BOUNDARY_TERMS = [
  // HEV
  'hev',
  'mhev',
  // PHEV / EREV / REEV
  'phev',
  'erev',
  'reev',
  // ICE
  'mpg',
  'efuel',
];

/** Terms that can safely use includes() (multi-word, long enough). */
const INCLUDES_TERMS = [
  // --- HEV ---
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

  // --- PHEV ---
  // Spanish
  'híbrido enchufable',
  'hibrido enchufable',
  // English
  'plug-in hybrid',
  'plug in hybrid',
  'plugin hybrid',

  // --- EREV / REEV (the apparatus; only exists in range-extended vehicles) ---
  'range extender',
  'range-extender',

  // --- ICE signals ---
  // Spanish
  'l/100 km',
  'l/100km',
  'combustible sintético',
  'gas renovable',
  'motor de explosión',
  // English
  'e-fuel',
  'synthetic fuel',
];

const boundaryRegexes = BOUNDARY_TERMS.map(
  (term) => new RegExp(`\\b${term}s?\\b`),
);

/**
 * Returns the canonical blacklisted term that matches the article, or null
 * if none. Exposed so the scraper can log WHICH keyword discarded an
 * article: keyword discards are never inserted in the database, so that log
 * is their only trace.
 */
export function excludedPowertrainMatch(title: string, excerpt: string): string | null {
  const text = `${title} ${excerpt}`.toLowerCase().replace(/\u00a0/g, ' ');

  // Boundary matching for short terms / acronyms
  for (let i = 0; i < boundaryRegexes.length; i++) {
    if (boundaryRegexes[i].test(text)) {
      return BOUNDARY_TERMS[i];
    }
  }

  // Includes matching for multi-word terms
  for (const term of INCLUDES_TERMS) {
    if (text.includes(term)) {
      return term;
    }
  }

  // No excluded powertrain mentioned
  return null;
}

/**
 * Returns true if the article is a BEV candidate (should be kept).
 * Returns false if the article should be discarded (non-BEV powertrain).
 */
export function isNotExcludedPowertrain(title: string, excerpt: string): boolean {
  return excludedPowertrainMatch(title, excerpt) === null;
}
