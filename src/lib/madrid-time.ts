/**
 * Building a real instant from "this day, 08:00 Europe/Madrid" (task A3, phase
 * 4) — the one place this codebase turns a wall-clock day into the `timestamptz`
 * that actually gates `posts`' public-read RLS.
 *
 * Madrid is not a fixed UTC offset: UTC+1 in winter (CET), UTC+2 in summer
 * (CEST). Concatenating a hardcoded `T08:00:00Z` ships articles an hour early
 * or late, silently, twice a year. No timezone library is in this project's
 * dependencies, so this uses the standard round-trip technique: format a guess
 * instant in the target zone to read off its real offset, then correct by it.
 */

const TIME_ZONE = "Europe/Madrid";

/**
 * The UTC offset (in minutes, positive = ahead of UTC) that `timeZone` has at
 * the given instant.
 */
function offsetMinutesAt(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // The zone's wall-clock digits at `utcMs`, read back as if they were UTC
  // themselves. The gap between that and the real `utcMs` IS the offset.
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (asIfUtc - utcMs) / 60000;
}

/**
 * The UTC instant (ISO string) for `dateStr` (`YYYY-MM-DD`) at `hour:00:00`
 * wall-clock time in Madrid.
 *
 * Single pass, not iterative: the EU DST transition always lands at 01:00 UTC,
 * and every `hour` this app schedules at (08:00) is comfortably past that on
 * the same calendar day — so sampling the offset at the naive UTC guess always
 * reads the offset already in effect at the real target hour, transition day
 * included. Verified in the test file against both 2026 transition dates.
 *
 * @example madridPublishInstant("2026-01-15") → "2026-01-15T07:00:00.000Z" (CET, UTC+1)
 * @example madridPublishInstant("2026-07-15") → "2026-07-15T06:00:00.000Z" (CEST, UTC+2)
 */
export function madridPublishInstant(dateStr: string, hour = 8): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Fecha de publicación no válida: "${dateStr}".`);
  }

  const guessUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  const offsetMin = offsetMinutesAt(guessUtc, TIME_ZONE);
  return new Date(guessUtc - offsetMin * 60000).toISOString();
}
