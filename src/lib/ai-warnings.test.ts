import { describe, it, expect } from "vitest";
import {
  resolveWarningText,
  WARNING_DEFINITIONS,
  type WarningType,
} from "./ai-warnings";

const ALL_TYPES: WarningType[] = [
  "price_non_european",
  "price_subsidized",
  "autonomy_cltc",
  "autonomy_wltp_no_real",
  "launch_non_european",
  "prototype_as_product",
];

describe("WARNING_DEFINITIONS", () => {
  it("defines exactly the 6 canonical warning types", () => {
    expect(Object.keys(WARNING_DEFINITIONS).sort()).toEqual([...ALL_TYPES].sort());
  });

  it("provides both es and en copy for every type", () => {
    for (const type of ALL_TYPES) {
      expect(WARNING_DEFINITIONS[type].es).toBeTruthy();
      expect(WARNING_DEFINITIONS[type].en).toBeTruthy();
    }
  });
});

describe("resolveWarningText", () => {
  it("returns Spanish copy for an 'es' language", () => {
    expect(resolveWarningText({ type: "autonomy_cltc" }, "es")).toBe(
      WARNING_DEFINITIONS.autonomy_cltc.es,
    );
  });

  it("returns English copy for an 'en' language", () => {
    expect(resolveWarningText({ type: "autonomy_cltc" }, "en")).toBe(
      WARNING_DEFINITIONS.autonomy_cltc.en,
    );
  });

  it("treats language codes case-insensitively and by prefix (en-US)", () => {
    expect(resolveWarningText({ type: "price_subsidized" }, "EN-US")).toBe(
      WARNING_DEFINITIONS.price_subsidized.en,
    );
  });

  it("falls back to Spanish for an unknown language", () => {
    expect(resolveWarningText({ type: "prototype_as_product" }, "fr")).toBe(
      WARNING_DEFINITIONS.prototype_as_product.es,
    );
  });
});
