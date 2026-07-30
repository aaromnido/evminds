import { describe, expect, it } from "vitest";
import { madridLocalToUtcIso, madridPublishInstant, utcIsoToMadridLocal } from "./madrid-time";

describe("madridPublishInstant", () => {
  it("is UTC+1 (07:00 UTC) in winter, CET", () => {
    expect(madridPublishInstant("2026-01-15")).toBe("2026-01-15T07:00:00.000Z");
  });

  it("is UTC+2 (06:00 UTC) in summer, CEST", () => {
    expect(madridPublishInstant("2026-07-15")).toBe("2026-07-15T06:00:00.000Z");
  });

  it("already reflects CEST on the spring-forward day (2026-03-29, clocks change at 01:00 UTC)", () => {
    expect(madridPublishInstant("2026-03-29")).toBe("2026-03-29T06:00:00.000Z");
  });

  it("already reflects CET on the fall-back day (2026-10-25, clocks change at 01:00 UTC)", () => {
    expect(madridPublishInstant("2026-10-25")).toBe("2026-10-25T07:00:00.000Z");
  });

  it("rolls over correctly across a year boundary", () => {
    expect(madridPublishInstant("2026-12-31")).toBe("2026-12-31T07:00:00.000Z");
    expect(madridPublishInstant("2027-01-01")).toBe("2027-01-01T07:00:00.000Z");
  });

  it("honors a custom hour", () => {
    expect(madridPublishInstant("2026-01-15", 20)).toBe("2026-01-15T19:00:00.000Z");
  });

  it("throws on a malformed date instead of silently publishing at the epoch", () => {
    expect(() => madridPublishInstant("not-a-date")).toThrow();
    expect(() => madridPublishInstant("")).toThrow();
  });
});

describe("madridLocalToUtcIso", () => {
  it("converts a Madrid wall-clock datetime-local value to its UTC instant (CET, winter)", () => {
    expect(madridLocalToUtcIso("2026-01-20T10:30")).toBe("2026-01-20T09:30:00.000Z");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    expect(madridLocalToUtcIso("2026-08-10T08:00")).toBe("2026-08-10T06:00:00.000Z");
  });

  it("throws on a malformed value instead of silently returning the epoch", () => {
    expect(() => madridLocalToUtcIso("not-a-date")).toThrow();
    expect(() => madridLocalToUtcIso("")).toThrow();
  });
});

describe("utcIsoToMadridLocal", () => {
  it("converts a UTC instant to its Madrid wall-clock datetime-local value (CET, winter)", () => {
    expect(utcIsoToMadridLocal("2026-01-20T09:30:00Z")).toBe("2026-01-20T10:30");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    expect(utcIsoToMadridLocal("2026-08-10T06:00:00Z")).toBe("2026-08-10T08:00");
  });

  it("round-trips with madridLocalToUtcIso", () => {
    const local = "2026-08-10T08:00";
    expect(utcIsoToMadridLocal(madridLocalToUtcIso(local))).toBe(local);
  });
});
