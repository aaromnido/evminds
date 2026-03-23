/**
 * User feed preferences — read from cookie (SSR) or localStorage (client)
 *
 * Preferences are stored as a JSON object where keys are pref IDs
 * and values are booleans. Only OFF preferences are stored (everything ON by default).
 *
 * Cookie name: evminds-prefs
 * localStorage key: evminds-prefs
 */

export interface FeedPreferences {
  excludedSources: string[];    // source names (e.g., "electrek.co")
  excludedCategories: string[]; // category names (e.g., "Renovables")
  onlyWithComments: boolean;    // show only articles with comments
}

const COOKIE_NAME = "evminds-prefs";

/**
 * Parse preferences from a cookie header string (for SSR).
 * Returns excluded source slugs and category slugs.
 */
export function readPrefsFromCookie(cookieHeader: string | null): FeedPreferences {
  const empty: FeedPreferences = { excludedSources: [], excludedCategories: [], onlyWithComments: false };
  if (!cookieHeader) return empty;

  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return empty;

  try {
    const raw = JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
    return {
      excludedSources: Array.isArray(raw.excludedSources) ? raw.excludedSources : [],
      excludedCategories: Array.isArray(raw.excludedCategories) ? raw.excludedCategories : [],
      onlyWithComments: raw.onlyWithComments === true,
    };
  } catch {
    return empty;
  }
}
