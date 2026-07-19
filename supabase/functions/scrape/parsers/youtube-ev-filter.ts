/**
 * Filter: EV-related content detector for general YouTube channels
 * Used for channels like cochesnet and motorpuntoes that cover all vehicles.
 * Checks title + description for EV-related keywords.
 */

const EV_KEYWORDS = [
  // Spanish
  'eléctrico', 'electrico', 'eléctrica', 'electrica',
  'ev ', ' ev', 'bev',
  'cero emisiones',
  'batería', 'bateria', 'baterías', 'baterias',
  'autonomía eléctrica', 'autonomia electrica',
  'carga rápida', 'carga rapida',
  'cargador', 'punto de carga', 'electrolinera',
  'kwh', 'kw ',
  'tesla', 'byd', 'nio', 'xpeng', 'leapmotor', 'zeekr',
  'polestar', 'rivian', 'lucid',
  'ioniq', 'e-tron', 'etron', 'id.3', 'id.4', 'id.5', 'id.7',
  'megane e-tech', 'e-208', 'e-308', 'e-2008', 'e-3008',
  'enyaq', 'born', 'mach-e', 'mustang mach',
  'leaf', 'ariya', 'spring',
  // English
  'electric vehicle', 'electric car', 'electric suv',
  'battery pack', 'range anxiety',
  'supercharger', 'fast charging', 'dc charging',
  'zero emission',
];

/**
 * Checks if a YouTube video is related to electric vehicles
 * by scanning title + description for EV keywords.
 * @param title - Video title
 * @param description - Video description (already cleaned or raw)
 * @returns true if the video is EV-related
 */
export function isYouTubeEVRelated(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return EV_KEYWORDS.some(keyword => text.includes(keyword));
}
