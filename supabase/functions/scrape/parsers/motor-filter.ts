/**
 * Filter: EV-related content detector for motor.es
 * Motor.es is a general automotive site, so we filter for electric vehicle content only
 */

const EV_KEYWORDS = [
  // Spanish keywords
  'eléctrico', 'eléctricos', 'eléctrica', 'eléctricas',
  'batería', 'baterías', 'carga', 'recarga', 'autonomía',
  'híbrido', 'híbridos', 'enchufable', 'enchufables',
  'kwh', 'kw', 'ev', 'phev', 'bev',
  // English keywords (sometimes used in Spanish articles)
  'electric', 'battery', 'charging', 'range', 'hybrid',
  // Brand names associated with EVs
  'tesla', 'byd', 'nissan leaf', 'polestar', 'rivian',
  'lucid', 'fisker', 'nio', 'xpeng', 'zeekr',
  // Specific EV terms
  'supercharger', 'wallbox', 'punto de recarga',
  'movilidad eléctrica', 'vehículo eléctrico'
];

/**
 * Checks if an article is related to electric vehicles
 * @param title - Article title
 * @param excerpt - Article excerpt/description
 * @returns true if article contains EV-related keywords
 */
export function isEVRelated(title: string, excerpt: string): boolean {
  const text = `${title} ${excerpt}`.toLowerCase();

  return EV_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}
