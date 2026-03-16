/**
 * Categories for EVMinds content
 * Based on PRD v1.2 Section 5
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
}

/**
 * All available categories in the system
 */
export const CATEGORIES: Category[] = [
  {
    id: "coches-electricos",
    slug: "coches-electricos",
    name: "Coches eléctricos",
    description: "Modelos, pruebas, comparativas, lanzamientos",
    color: "blue",
  },
  {
    id: "baterias-tecnologia",
    slug: "baterias-tecnologia",
    name: "Baterías y tecnología",
    description: "Tecnología de baterías, autonomía, innovación",
    color: "purple",
  },
  {
    id: "renovables",
    slug: "renovables",
    name: "Renovables",
    description: "Energía solar, eólica, almacenamiento energético",
    color: "green",
  },
  {
    id: "infraestructura",
    slug: "infraestructura",
    name: "Infraestructura de carga",
    description: "Red de cargadores, puntos de recarga, estándares",
    color: "orange",
  },
  {
    id: "legislacion",
    slug: "legislacion",
    name: "Legislación y ayudas",
    description: "Subvenciones, normativa, impuestos, planes de apoyo",
    color: "red",
  },
  {
    id: "industria",
    slug: "industria",
    name: "Industria",
    description: "Fabricantes, inversiones, mercado, ventas",
    color: "gray",
  },
];

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.slug === slug);
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Get all category slugs (useful for static path generation)
 */
export function getAllCategorySlugs(): string[] {
  return CATEGORIES.map((cat) => cat.slug);
}

/**
 * Check if a category slug is valid
 */
export function isValidCategorySlug(slug: string): boolean {
  return CATEGORIES.some((cat) => cat.slug === slug);
}

/**
 * Get category slug from name
 */
export function getCategorySlugByName(name: string): string | undefined {
  return CATEGORIES.find((cat) => cat.name === name)?.slug;
}
