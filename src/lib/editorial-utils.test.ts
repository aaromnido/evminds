import { describe, expect, it } from "vitest";
import {
  formatAge,
  formatExpiry,
  formatPublishSchedule,
  shiftDateByDays,
  sourceHostname,
} from "./editorial-utils";

const NOW = "2026-07-26T12:00:00.000Z";

/** `NOW` minus N hours, as an ISO string. */
function hoursAgo(hours: number): string {
  return new Date(new Date(NOW).getTime() - hours * 60 * 60 * 1000).toISOString();
}

describe("formatAge", () => {
  it("says 'hace un momento' under an hour", () => {
    expect(formatAge(NOW, hoursAgo(0.5))).toBe("hace un momento");
  });

  it("counts hours up to a day", () => {
    expect(formatAge(NOW, hoursAgo(1))).toBe("hace 1 h");
    expect(formatAge(NOW, hoursAgo(23))).toBe("hace 23 h");
  });

  it("says 'ayer' at one day, then counts days", () => {
    expect(formatAge(NOW, hoursAgo(24))).toBe("ayer");
    expect(formatAge(NOW, hoursAgo(47))).toBe("ayer");
    expect(formatAge(NOW, hoursAgo(48))).toBe("hace 2 días");
  });
});

describe("formatExpiry", () => {
  /** `NOW` plus N hours. */
  function inHours(hours: number): string {
    return new Date(new Date(NOW).getTime() + hours * 60 * 60 * 1000).toISOString();
  }

  it("is calm beyond a day", () => {
    expect(formatExpiry(NOW, inHours(30)).urgency).toBe("calm");
  });

  it("turns amber under 24 h and red under 6 h", () => {
    // The three bands are what drives the pill's colour, so the boundaries are
    // the thing worth pinning: they are one edit away from all reading the same.
    expect(formatExpiry(NOW, inHours(23.9)).urgency).toBe("soon");
    expect(formatExpiry(NOW, inHours(6)).urgency).toBe("soon");
    expect(formatExpiry(NOW, inHours(5.9)).urgency).toBe("urgent");
  });

  it("is gone once the moment has passed", () => {
    const expired = formatExpiry(NOW, hoursAgo(1));

    expect(expired.urgency).toBe("gone");
    expect(expired.label).toBe("caducada");
    expect(expired.hoursLeft).toBe(0);
  });
});

describe("formatPublishSchedule", () => {
  it("rearranges the input strings without going through Date", () => {
    // The user picked a wall-clock day, not an instant: parsing it would shift it
    // by a timezone and could render differently on the server than after
    // hydration.
    expect(formatPublishSchedule("2026-08-05", "08:00")).toBe("05/08/2026, 08:00");
  });

  it("drops the time where there is none — Motor.es sets its own", () => {
    expect(formatPublishSchedule("2026-08-05", "")).toBe("05/08/2026");
  });

  it("returns nothing for a date that is not one", () => {
    expect(formatPublishSchedule("", "08:00")).toBe("");
    expect(formatPublishSchedule("2026-08", "08:00")).toBe("");
  });
});

describe("shiftDateByDays", () => {
  it("adds the week EVminds publishes after Motor.es", () => {
    expect(shiftDateByDays("2026-07-20", 7)).toBe("2026-07-27");
  });

  it("crosses a month end", () => {
    expect(shiftDateByDays("2026-07-31", 7)).toBe("2026-08-07");
  });

  it("crosses a year end", () => {
    expect(shiftDateByDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("gets a leap year right", () => {
    expect(shiftDateByDays("2028-02-24", 7)).toBe("2028-03-02");
    expect(shiftDateByDays("2027-02-24", 7)).toBe("2027-03-03");
  });

  it("goes backwards too", () => {
    expect(shiftDateByDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("returns nothing for a half-typed date, rather than a valid-but-wrong one", () => {
    expect(shiftDateByDays("", 7)).toBe("");
    expect(shiftDateByDays("2026-07", 7)).toBe("");
    expect(shiftDateByDays("no es una fecha", 7)).toBe("");
  });
});

describe("sourceHostname", () => {
  it("drops the www", () => {
    expect(sourceHostname("https://www.electrek.co/algo")).toBe("electrek.co");
  });

  it("gives back whatever it got when it is not a URL", () => {
    expect(sourceHostname("no es una url")).toBe("no es una url");
  });
});
