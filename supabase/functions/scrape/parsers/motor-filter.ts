/**
 * Filter: EV-related content detector for motor.es
 * Uses RSS <category> tags for reliable filtering instead of keyword matching.
 * motor.es tags EV articles with specific categories like "Coches eléctricos",
 * "Baterías", "PHEV", "HEV", etc.
 */

const EV_CATEGORIES = [
  'coches eléctricos',
  'baterías',
  'baterías de estado sólido',
  'phev',
  'hev',
  'bev',
];

/**
 * Checks if an article is related to electric vehicles
 * by matching its RSS categories against known EV categories.
 * @param categories - RSS category tags for the article
 * @returns true if any category matches an EV category
 */
export function isEVRelated(categories: string[]): boolean {
  const normalised = categories.map(c => c.toLowerCase());
  return normalised.some(cat => EV_CATEGORIES.includes(cat));
}
