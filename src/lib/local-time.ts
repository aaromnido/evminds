/**
 * Building a real instant from "this day, 08:00 local time" (task A3, phase
 * 4) — the one place this codebase turns a wall-clock day into the `timestamptz`
 * that actually gates `posts`' public-read RLS.
 *
 * The site's local time zone (Europe/Madrid) is not a fixed UTC offset: UTC+1
 * in winter (CET), UTC+2 in summer (CEST). Concatenating a hardcoded
 * `T08:00:00Z` ships articles an hour early or late, silently, twice a year.
 * No timezone library is in this project's dependencies, so this uses the
 * standard round-trip technique: format a guess instant in the target zone to
 * read off its real offset, then correct by it.
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
 * local wall-clock time.
 *
 * Single pass, not iterative: the EU DST transition always lands at 01:00 UTC,
 * and every `hour` this app schedules at (08:00) is comfortably past that on
 * the same calendar day — so sampling the offset at the naive UTC guess always
 * reads the offset already in effect at the real target hour, transition day
 * included. Verified in the test file against both 2026 transition dates.
 *
 * @example localPublishInstant("2026-01-15") → "2026-01-15T07:00:00.000Z" (CET, UTC+1)
 * @example localPublishInstant("2026-07-15") → "2026-07-15T06:00:00.000Z" (CEST, UTC+2)
 */
export function localPublishInstant(dateStr: string, hour = 8): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Fecha de publicación no válida: "${dateStr}".`);
  }

  const guessUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  const offsetMin = offsetMinutesAt(guessUtc, TIME_ZONE);
  return new Date(guessUtc - offsetMin * 60000).toISOString();
}

/**
 * The UTC instant (ISO string) for a local wall-clock `YYYY-MM-DDTHH:mm`
 * value — the shape a `<input type="datetime-local">` posts back as (it's
 * timezone-naive; the browser has no idea it means local time). Same
 * round-trip technique as `localPublishInstant`, generalized to arbitrary
 * minutes instead of a fixed on-the-hour schedule.
 *
 * @example localToUtcIso("2026-08-10T08:00") → "2026-08-10T06:00:00.000Z" (CEST)
 */
export function localToUtcIso(localDateTime: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localDateTime);
  if (!match) {
    throw new Error(`Fecha/hora no válida: "${localDateTime}".`);
  }
  const [, year, month, day, hour, minute] = match.map(Number);

  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMin = offsetMinutesAt(guessUtc, TIME_ZONE);
  return new Date(guessUtc - offsetMin * 60000).toISOString();
}

/**
 * The reverse of `localToUtcIso`: a UTC ISO instant formatted as local
 * wall-clock `YYYY-MM-DDTHH:mm`, ready to drop straight into a
 * `<input type="datetime-local">`'s `value`/`defaultValue`.
 *
 * @example utcIsoToLocal("2026-08-10T06:00:00Z") → "2026-08-10T08:00" (CEST)
 */
export function utcIsoToLocal(isoString: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(isoString));

  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Whether `date` falls on today's calendar day in local wall-clock time
 * (not UTC — a publish near midnight can be "today" in one zone and
 * "yesterday" in the other).
 */
export function isLocalToday(date: Date): boolean {
  const dayOf = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  return dayOf(date) === dayOf(new Date());
}
