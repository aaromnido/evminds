/**
 * Presentation helpers for the editorial admin (task A3).
 *
 * Every function takes an explicit `nowIso` reference instead of reading the
 * clock, so a server-rendered island and its hydrated counterpart produce the
 * exact same string (same pattern as `nowIso` in `admin/posts/index.astro`).
 */

const HOUR_MS = 60 * 60 * 1000;

/** How close to expiry an idea is, used to pick its visual treatment. */
export type ExpiryUrgency = "calm" | "soon" | "urgent" | "gone";

export interface ExpiryInfo {
  label: string;
  urgency: ExpiryUrgency;
  hoursLeft: number;
}

function hoursBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / HOUR_MS;
}

/**
 * Age of an idea in plain Spanish.
 * @example formatAge("2026-07-25T12:00:00Z", "2026-07-25T06:00:00Z") → "hace 6 h"
 */
export function formatAge(nowIso: string, isoString: string): string {
  const hours = Math.floor(hoursBetween(isoString, nowIso));
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

/**
 * Time left before the curator expires an idea (48 h after it was fetched),
 * plus the urgency band that drives its color.
 */
export function formatExpiry(nowIso: string, expiresAtIso: string): ExpiryInfo {
  const hoursLeft = Math.floor(hoursBetween(nowIso, expiresAtIso));
  if (hoursLeft <= 0) return { label: "caducada", urgency: "gone", hoursLeft: 0 };
  if (hoursLeft < 6) return { label: `caduca en ${hoursLeft} h`, urgency: "urgent", hoursLeft };
  if (hoursLeft < 24) return { label: `caduca en ${hoursLeft} h`, urgency: "soon", hoursLeft };
  return { label: `caduca en ${hoursLeft} h`, urgency: "calm", hoursLeft };
}

/** Hostname of a source URL, for the "ver fuente" affordance. */
export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
