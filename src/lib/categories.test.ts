import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  getCategoryBySlug,
  getCategoryById,
  getAllCategorySlugs,
  isValidCategorySlug,
  getCategorySlugByName,
} from "./categories";

describe("CATEGORIES", () => {
  it("defines the 6 canonical news categories", () => {
    // Must stay in parity with the DB CHECK constraint (mig. 46) and categorize().
    expect(CATEGORIES).toHaveLength(6);
    expect(getAllCategorySlugs()).toEqual([
      "coches-electricos",
      "baterias-tecnologia",
      "renovables",
      "infraestructura",
      "legislacion",
      "industria",
    ]);
  });
});

describe("category lookups", () => {
  it("finds a category by slug", () => {
    expect(getCategoryBySlug("renovables")?.name).toBe("Renovables");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getCategoryBySlug("nope")).toBeUndefined();
  });

  it("finds a category by id", () => {
    expect(getCategoryById("industria")?.name).toBe("Industria");
  });

  it("validates a known slug and rejects an unknown one", () => {
    expect(isValidCategorySlug("legislacion")).toBe(true);
    expect(isValidCategorySlug("nope")).toBe(false);
  });

  it("maps a category name back to its slug", () => {
    expect(getCategorySlugByName("Coches eléctricos")).toBe("coches-electricos");
    expect(getCategorySlugByName("Inexistente")).toBeUndefined();
  });
});
