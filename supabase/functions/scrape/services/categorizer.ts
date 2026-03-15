/**
 * Service: Auto-categorization of articles based on keywords
 * Analyzes title and excerpt to assign the most relevant category
 */

const CATEGORY_KEYWORDS = {
  'Coches eléctricos': [
    'tesla', 'byd', 'volkswagen', 'nissan leaf', 'modelo', 'coche',
    'vehículo', 'suv', 'sedan', 'volkswagen', 'hyundai', 'kia', 'renault',
    'polestar', 'rivian', 'lucid', 'fisker', 'nio'
  ],
  'Baterías y tecnología': [
    'batería', 'battery', 'autonomía', 'range', 'kwh', 'carga rápida',
    'litio', 'solid-state', 'sodium', 'lfp', 'cathode', 'anode', 'cells'
  ],
  'Renovables': [
    'solar', 'eólica', 'renovable', 'energía limpia', 'paneles',
    'wind', 'photovoltaic', 'green energy', 'sustainable'
  ],
  'Infraestructura de carga': [
    'cargador', 'punto de recarga', 'estación', 'supercharger', 'wallbox',
    'charging station', 'fast charger', 'dc charging', 'charging network'
  ],
  'Legislación y ayudas': [
    'ayuda', 'subvención', 'plan', 'normativa', 'legislación', 'impuesto',
    'subsidy', 'incentive', 'regulation', 'policy', 'law', 'tax credit'
  ],
  'Industria': [
    'fabricante', 'producción', 'inversión', 'ventas', 'mercado', 'planta',
    'manufacturer', 'production', 'investment', 'sales', 'factory', 'plant'
  ]
};

/**
 * Categorizes an article based on keyword matching
 * @param title - Article title
 * @param excerpt - Article excerpt/description
 * @returns Category name (defaults to 'Industria' if no match)
 */
export function categorize(title: string, excerpt: string): string {
  const text = `${title} ${excerpt}`.toLowerCase();

  // Iterate through categories and find first match
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  // Default category when no keywords match
  return 'Industria';
}
