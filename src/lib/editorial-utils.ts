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

/**
 * The publish date and time as they read in Spanish: `12/08/2026, 09:00`.
 *
 * Built by rearranging the strings the native `date` / `time` inputs give us
 * (`YYYY-MM-DD` and `HH:MM`) instead of going through `Date`. That avoids the
 * timezone shift a parsed date would introduce — the user picked a wall clock
 * time, not an instant — and keeps the output identical on the server and after
 * hydration.
 */
export function formatPublishSchedule(date: string, time: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return "";
  const dayText = `${day}/${month}/${year}`;
  return time ? `${dayText}, ${time}` : dayText;
}

/**
 * A `YYYY-MM-DD` date shifted by whole days, still as `YYYY-MM-DD`.
 *
 * `Date.UTC` is used purely as a calendar: it handles month and year boundaries
 * and leap years, which plain string maths does not. It reads no clock and no
 * local timezone, so the same input always gives the same output — on the server
 * and after hydration alike. Returns `""` on anything that isn't a date, so a
 * half-typed input can't produce a bogus one.
 */
export function shiftDateByDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Hostname of a source URL, for the "ver fuente" affordance. */
export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
