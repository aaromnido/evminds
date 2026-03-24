/**
 * Sources (Media outlets) for EVMinds content
 * Loaded dynamically from Supabase — no need to update this file when activating/deactivating sources
 */

import { supabase } from "./supabase";

export interface Source {
  id: string;
  slug: string;
  name: string; // Name as it appears in database (e.g., "electrek.co")
  displayName: string; // Clean name for display without domain (e.g., "electrek")
  url: string;
  lang: 'es' | 'en';
  feedType: 'rss' | 'html' | 'youtube';
}

/**
 * Human-friendly display names for known sources.
 * Falls back to stripping the domain extension.
 */
const DISPLAY_NAMES: Record<string, string> = {
  "cnevpost.com": "CNEVPost",
  "electrek.co": "Electrek",
  "insideevs.com": "InsideEVs",
  "hibridosyelectricos.com": "Híbridos y Eléctricos",
  "motor.es": "Motor.es",
  "somoselectricos.com": "SomosEléctricos",
  "bjornnyland": "Bjørn Nyland",
  "cochesnet-yt": "Coches.net YT",
  "earcos": "Eduardo Arcos",
  "electrifyingcom": "Electrifying.com",
  "electromiaumiau": "Electromiaumiau",
  "motorpuntoes": "Motor.es YT",
  "somoselectricos-yt": "SomosEléctricos YT",
};

function toDisplayName(name: string): string {
  return DISPLAY_NAMES[name] || name.replace(/\.(com|co|org|net|io|es)$/i, "");
}

/**
 * Create a URL-safe slug from source name
 */
function toSlug(name: string): string {
  return toDisplayName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Cache loaded sources to avoid repeated queries within the same request lifecycle
let _sourcesCache: Source[] | null = null;

/**
 * Fetch all active sources from Supabase
 */
export async function loadSources(): Promise<Source[]> {
  if (_sourcesCache) return _sourcesCache;

  const { data, error } = await supabase
    .from("sources")
    .select("id, name, url, lang, feed_type")
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("Failed to load sources:", error);
    return [];
  }

  type SourceRow = { id: string; name: string; url: string; lang: 'es' | 'en'; feed_type: 'rss' | 'html' | 'youtube' };
  _sourcesCache = ((data ?? []) as SourceRow[]).map((s) => ({
    id: s.id,
    slug: toSlug(s.name),
    name: s.name,
    displayName: toDisplayName(s.name),
    url: s.url,
    lang: s.lang,
    feedType: s.feed_type,
  }));

  return _sourcesCache;
}

/**
 * Get source by slug
 */
export async function getSourceBySlug(
  slug: string
): Promise<Source | undefined> {
  const sources = await loadSources();
  return sources.find((source) => source.slug === slug);
}

/**
 * Get source by name (matches against database name, e.g., "electrek.co")
 */
export async function getSourceByName(
  name: string
): Promise<Source | undefined> {
  const sources = await loadSources();

  // Direct match first
  const directMatch = sources.find(
    (source) => source.name.toLowerCase() === name.toLowerCase()
  );
  if (directMatch) return directMatch;

  // Fallback: match by cleaned name
  const cleanName = toDisplayName(name).toLowerCase();
  return sources.find(
    (source) => toDisplayName(source.name).toLowerCase() === cleanName
  );
}

/**
 * Get all source slugs
 */
export async function getAllSourceSlugs(): Promise<string[]> {
  const sources = await loadSources();
  return sources.map((source) => source.slug);
}

/**
 * Check if a source slug is valid
 */
export async function isValidSourceSlug(slug: string): Promise<boolean> {
  const sources = await loadSources();
  return sources.some((source) => source.slug === slug);
}

/**
 * Get source slug from name (matches against database name)
 */
export async function getSourceSlugByName(
  name: string
): Promise<string | undefined> {
  const source = await getSourceByName(name);
  return source?.slug;
}
