import { describe, it, expect } from "vitest";
import { formatDate, formatShortDate, formatShortDateTime, formatRelativeTime } from "./date-utils";

describe("formatDate", () => {
  it("formats an ISO timestamp to a long Spanish date", () => {
    // Midday UTC keeps the calendar day stable across local timezones.
    expect(formatDate("2026-01-20T12:00:00Z")).toBe("20 de enero de 2026");
  });
});

describe("formatShortDate", () => {
  it("formats an ISO timestamp to a zero-padded numeric Spanish date", () => {
    expect(formatShortDate("2026-01-05T12:00:00Z")).toBe("05/01/2026");
  });
});

describe("formatShortDateTime", () => {
  it("formats an ISO timestamp to a zero-padded numeric Spanish date and time in Europe/Madrid", () => {
    // CET (UTC+1) in January: 09:30 UTC → 10:30 Madrid.
    expect(formatShortDateTime("2026-01-20T09:30:00Z")).toBe("20/01/2026, 10:30");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    expect(formatShortDateTime("2026-07-15T09:30:00Z")).toBe("15/07/2026, 11:30");
  });
});

describe("formatRelativeTime", () => {
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  it("returns 'hoy' for today", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("hoy");
  });

  it("returns 'ayer' for one day ago", () => {
    expect(formatRelativeTime(daysAgo(1))).toBe("ayer");
  });

  it("returns days for less than a week", () => {
    expect(formatRelativeTime(daysAgo(3))).toBe("hace 3 días");
  });

  it("returns weeks for less than a month", () => {
    expect(formatRelativeTime(daysAgo(14))).toBe("hace 2 semanas");
  });

  it("returns months for less than a year", () => {
    expect(formatRelativeTime(daysAgo(90))).toBe("hace 3 meses");
  });

  it("returns years for a year or more", () => {
    expect(formatRelativeTime(daysAgo(400))).toBe("hace 1 años");
  });
});
