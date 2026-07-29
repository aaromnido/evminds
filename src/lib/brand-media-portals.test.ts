import { describe, it, expect } from "vitest";
import { BRAND_MEDIA_PORTALS, searchBrands, resolveBrand } from "./brand-media-portals";

describe("BRAND_MEDIA_PORTALS", () => {
  it("carries the 33 brands Fer supplied", () => {
    expect(BRAND_MEDIA_PORTALS).toHaveLength(33);
  });

  it("has a https URL and a unique name for every brand", () => {
    const names = new Set<string>();
    for (const brand of BRAND_MEDIA_PORTALS) {
      expect(brand.url).toMatch(/^https:\/\//);
      expect(names.has(brand.name)).toBe(false);
      names.add(brand.name);
    }
  });

  it("marks exactly BMW, MINI and Audi as needing registration", () => {
    const gated = BRAND_MEDIA_PORTALS.filter((b) => b.access === "registration").map((b) => b.name);
    expect(gated).toEqual(["BMW", "MINI", "Audi"]);
  });
});

describe("searchBrands", () => {
  it("returns the whole list for an empty query", () => {
    expect(searchBrands("")).toHaveLength(33);
    expect(searchBrands("   ")).toHaveLength(33);
  });

  it("is case-insensitive", () => {
    expect(searchBrands("TESLA")[0]?.name).toBe("Tesla");
    expect(searchBrands("tesla")[0]?.name).toBe("Tesla");
  });

  it("is accent-insensitive in both directions", () => {
    // Typed without the diaeresis, and typed with it.
    expect(searchBrands("citroen")[0]?.name).toBe("Citroën");
    expect(searchBrands("citroën")[0]?.name).toBe("Citroën");
  });

  it("matches aliases", () => {
    expect(searchBrands("vw")[0]?.name).toBe("Volkswagen");
    expect(searchBrands("mercedes")[0]?.name).toBe("Mercedes-Benz");
    expect(searchBrands("lynk")[0]?.name).toBe("Lynk & Co");
  });

  it("ranks prefix matches above substring ones", () => {
    // "ni" starts NIO and Nissan, but only sits inside MINI.
    const results = searchBrands("ni").map((b) => b.name);
    expect(results).toContain("NIO");
    expect(results).toContain("Nissan");
    expect(results).toContain("MINI");
    expect(results.indexOf("MINI")).toBeGreaterThan(results.indexOf("NIO"));
    expect(results.indexOf("MINI")).toBeGreaterThan(results.indexOf("Nissan"));
  });

  it("ranks a prefix match on an alias as a prefix match", () => {
    // "merc" only reaches Mercedes-Benz through its alias, and it is still first.
    expect(searchBrands("merc")[0]?.name).toBe("Mercedes-Benz");
  });

  it("returns nothing for a brand we do not cover", () => {
    expect(searchBrands("Ferrari")).toEqual([]);
    expect(searchBrands("zzz")).toEqual([]);
  });
});

describe("resolveBrand", () => {
  it("resolves an exact name, whatever the casing or accents", () => {
    expect(resolveBrand("Hyundai")?.url).toBe("https://www.hyundai.news");
    expect(resolveBrand("hyundai")?.url).toBe("https://www.hyundai.news");
    expect(resolveBrand("citroen")?.name).toBe("Citroën");
    expect(resolveBrand("  Tesla  ")?.name).toBe("Tesla");
  });

  it("resolves an exact alias", () => {
    expect(resolveBrand("vw")?.name).toBe("Volkswagen");
    expect(resolveBrand("Lynk and Co")?.name).toBe("Lynk & Co");
  });

  it("does not resolve a partial query — that is a search, not a destination", () => {
    expect(resolveBrand("mer")).toBeNull();
    expect(resolveBrand("hyun")).toBeNull();
  });

  it("does not resolve a brand we do not cover — this is what keeps the button disabled", () => {
    expect(resolveBrand("Ferrari")).toBeNull();
    expect(resolveBrand("")).toBeNull();
  });
});
