import { describe, it, expect } from "vitest";
import { readPrefsFromCookie, hasPrefsCookie } from "./preferences";

const EMPTY = { excludedSources: [], excludedCategories: [], onlyWithComments: false };

/** Encode a prefs object the way the client stores it in the cookie. */
function cookie(value: unknown): string {
  return `evminds-prefs=${encodeURIComponent(JSON.stringify(value))}`;
}

describe("readPrefsFromCookie", () => {
  it("returns empty defaults for a null header", () => {
    expect(readPrefsFromCookie(null)).toEqual(EMPTY);
  });

  it("returns empty defaults when the cookie is absent", () => {
    expect(readPrefsFromCookie("other=1; another=2")).toEqual(EMPTY);
  });

  it("parses stored preferences", () => {
    const header = cookie({
      excludedSources: ["electrek.co"],
      excludedCategories: ["Renovables"],
      onlyWithComments: true,
    });
    expect(readPrefsFromCookie(header)).toEqual({
      excludedSources: ["electrek.co"],
      excludedCategories: ["Renovables"],
      onlyWithComments: true,
    });
  });

  it("finds the cookie among others", () => {
    const header = `foo=bar; ${cookie({ excludedSources: ["x"] })}; baz=qux`;
    expect(readPrefsFromCookie(header).excludedSources).toEqual(["x"]);
  });

  it("coerces non-array fields to empty arrays", () => {
    const header = cookie({ excludedSources: "not-an-array", excludedCategories: null });
    const prefs = readPrefsFromCookie(header);
    expect(prefs.excludedSources).toEqual([]);
    expect(prefs.excludedCategories).toEqual([]);
  });

  it("defaults onlyWithComments to false unless strictly true", () => {
    expect(readPrefsFromCookie(cookie({ onlyWithComments: "true" })).onlyWithComments).toBe(false);
  });

  it("returns empty defaults on malformed JSON", () => {
    expect(readPrefsFromCookie("evminds-prefs=%7Bnot-json")).toEqual(EMPTY);
  });
});

describe("hasPrefsCookie", () => {
  it("returns false for a null header", () => {
    expect(hasPrefsCookie(null)).toBe(false);
  });

  it("returns false when the cookie is absent", () => {
    expect(hasPrefsCookie("other=1; another=2")).toBe(false);
  });

  it("returns true when the cookie is present, regardless of its value", () => {
    expect(hasPrefsCookie("evminds-prefs=%7Bnot-json")).toBe(true);
  });

  it("finds the cookie among others", () => {
    expect(hasPrefsCookie(`foo=bar; ${cookie({ excludedSources: ["x"] })}; baz=qux`)).toBe(true);
  });
});
