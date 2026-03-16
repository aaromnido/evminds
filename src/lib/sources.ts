/**
 * Sources (Media outlets) for EVMinds content
 */

export interface Source {
  id: string;
  slug: string;
  name: string; // Name as it appears in database (e.g., "electrek.co")
  displayName: string; // Clean name for display (e.g., "Elektrek")
  url: string;
}

/**
 * All available sources in the system
 * These match the source names in Supabase (with domain)
 */
export const SOURCES: Source[] = [
  {
    id: "elektrek",
    slug: "elektrek",
    name: "electrek.co",
    displayName: "Elektrek",
    url: "https://electrek.co",
  },
  {
    id: "insideevs",
    slug: "insideevs",
    name: "insideevs.com",
    displayName: "InsideEVs",
    url: "https://insideevs.com",
  },
  {
    id: "cnevpost",
    slug: "cnevpost",
    name: "cnevpost.com",
    displayName: "CnEVPost",
    url: "https://cnevpost.com",
  },
];

/**
 * Get source by slug
 */
export function getSourceBySlug(slug: string): Source | undefined {
  return SOURCES.find((source) => source.slug === slug);
}

/**
 * Get source by name (matches against database name, e.g., "electrek.co")
 */
export function getSourceByName(name: string): Source | undefined {
  // Direct match first
  const directMatch = SOURCES.find(
    (source) => source.name.toLowerCase() === name.toLowerCase()
  );
  if (directMatch) return directMatch;

  // Fallback: try to match by removing domain extension
  const cleanName = name.replace(/\.(com|co|org|net|io)$/i, "").toLowerCase();
  return SOURCES.find((source) => {
    const sourceCleanName = source.name
      .replace(/\.(com|co|org|net|io)$/i, "")
      .toLowerCase();
    return sourceCleanName === cleanName;
  });
}

/**
 * Get all source slugs
 */
export function getAllSourceSlugs(): string[] {
  return SOURCES.map((source) => source.slug);
}

/**
 * Check if a source slug is valid
 */
export function isValidSourceSlug(slug: string): boolean {
  return SOURCES.some((source) => source.slug === slug);
}

/**
 * Get source slug from name (matches against database name)
 */
export function getSourceSlugByName(name: string): string | undefined {
  const source = getSourceByName(name);
  return source?.slug;
}
