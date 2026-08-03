import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates a plain ASCII title", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics from accented vowels", () => {
    expect(slugify("Camión Eléctrico")).toBe("camion-electrico");
  });

  it("converts ñ and Ñ to n and N before lowercasing", () => {
    expect(slugify("España Año Nuevo")).toBe("espana-ano-nuevo");
  });

  it("removes non-alphanumeric characters except spaces and hyphens", () => {
    expect(slugify("EV #1: 2024's Best!")).toBe("ev-1-2024s-best");
  });

  it("collapses multiple hyphens and trims leading/trailing ones", () => {
    expect(slugify("  --- Coche --- Nuevo ---  ")).toBe("coche-nuevo");
  });

  it("handles an empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles a string with only punctuation", () => {
    expect(slugify("!!! ??? ---")).toBe("");
  });

  // Canonical behaviour fixers (Familia A): apostrophes are removed without
  // inserting a hyphen; em-dashes are removed without inserting a hyphen.
  // The admin .tsx variants (Familia B) used to produce "tesla-s-car" and
  // "cafe-resume" — these tests pin the canonical output so no regression.
  it("removes apostrophes without converting to hyphens", () => {
    expect(slugify("Tesla's car")).toBe("teslas-car");
  });

  it("removes em-dashes without converting to hyphens", () => {
    expect(slugify("café—résumé")).toBe("caferesume");
  });

  it("drops Spanish articles from the slug", () => {
    expect(slugify("El Nuevo Tesla Model 3")).toBe("nuevo-tesla-model-3");
  });

  it("drops Spanish prepositions and conjunctions from the slug", () => {
    expect(slugify("El Coche del Futuro y su Autonomía")).toBe("coche-futuro-su-autonomia");
  });

  it("keeps the words intact when the title is only stopwords", () => {
    expect(slugify("El de la Que")).toBe("el-de-la-que");
  });
});
