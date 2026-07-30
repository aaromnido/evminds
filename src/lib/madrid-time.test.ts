import { describe, expect, it } from "vitest";
import { madridPublishInstant } from "./madrid-time";

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
