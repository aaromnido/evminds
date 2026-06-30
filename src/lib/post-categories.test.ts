import { describe, it, expect } from "vitest";
import { VALID_POST_CATEGORIES, isValidPostCategory } from "./post-categories";

describe("post categories", () => {
  it("defines the 5 in-house editorial categories", () => {
    expect([...VALID_POST_CATEGORIES]).toEqual([
      "Experiencia",
      "Guía",
      "Review",
      "Opinión",
      "Viaje",
    ]);
  });

  it("accepts a valid post category", () => {
    expect(isValidPostCategory("Review")).toBe(true);
  });

  it("rejects a value from the news category set (kept separate)", () => {
    expect(isValidPostCategory("Coches eléctricos")).toBe(false);
  });

  it("rejects an empty or unknown value", () => {
    expect(isValidPostCategory("")).toBe(false);
    expect(isValidPostCategory("Otro")).toBe(false);
  });
});
