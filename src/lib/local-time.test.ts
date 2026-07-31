import { describe, expect, it } from "vitest";
import { localToUtcIso, localPublishInstant, utcIsoToLocal } from "./local-time";

describe("localPublishInstant", () => {
  it("is UTC+1 (07:00 UTC) in winter, CET", () => {
    expect(localPublishInstant("2026-01-15")).toBe("2026-01-15T07:00:00.000Z");
  });

  it("is UTC+2 (06:00 UTC) in summer, CEST", () => {
    expect(localPublishInstant("2026-07-15")).toBe("2026-07-15T06:00:00.000Z");
  });

  it("already reflects CEST on the spring-forward day (2026-03-29, clocks change at 01:00 UTC)", () => {
    expect(localPublishInstant("2026-03-29")).toBe("2026-03-29T06:00:00.000Z");
  });

  it("already reflects CET on the fall-back day (2026-10-25, clocks change at 01:00 UTC)", () => {
    expect(localPublishInstant("2026-10-25")).toBe("2026-10-25T07:00:00.000Z");
  });

  it("rolls over correctly across a year boundary", () => {
    expect(localPublishInstant("2026-12-31")).toBe("2026-12-31T07:00:00.000Z");
    expect(localPublishInstant("2027-01-01")).toBe("2027-01-01T07:00:00.000Z");
  });

  it("honors a custom hour", () => {
    expect(localPublishInstant("2026-01-15", 20)).toBe("2026-01-15T19:00:00.000Z");
  });

  it("throws on a malformed date instead of silently publishing at the epoch", () => {
    expect(() => localPublishInstant("not-a-date")).toThrow();
    expect(() => localPublishInstant("")).toThrow();
  });
});

describe("localToUtcIso", () => {
  it("converts a local wall-clock datetime-local value to its UTC instant (CET, winter)", () => {
    expect(localToUtcIso("2026-01-20T10:30")).toBe("2026-01-20T09:30:00.000Z");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    expect(localToUtcIso("2026-08-10T08:00")).toBe("2026-08-10T06:00:00.000Z");
  });

  it("throws on a malformed value instead of silently returning the epoch", () => {
    expect(() => localToUtcIso("not-a-date")).toThrow();
    expect(() => localToUtcIso("")).toThrow();
  });
});

describe("utcIsoToLocal", () => {
  it("converts a UTC instant to its local wall-clock datetime-local value (CET, winter)", () => {
    expect(utcIsoToLocal("2026-01-20T09:30:00Z")).toBe("2026-01-20T10:30");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    expect(utcIsoToLocal("2026-08-10T06:00:00Z")).toBe("2026-08-10T08:00");
  });

  it("round-trips with localToUtcIso", () => {
    const local = "2026-08-10T08:00";
    expect(utcIsoToLocal(localToUtcIso(local))).toBe(local);
  });
});
