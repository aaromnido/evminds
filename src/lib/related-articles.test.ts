import { describe, it, expect } from "vitest";
import { extractKeywords, relatedArticleScore, searchTermsFor } from "./related-articles";

describe("extractKeywords", () => {
  it("keeps brand and model tokens", () => {
    expect(extractKeywords("Xpeng presenta el Mona L03 eléctrico")).toEqual(
      expect.arrayContaining(["xpeng", "mona", "l03"]),
    );
  });

  it("filters common Spanish stopwords", () => {
    const keywords = extractKeywords(
      "Este modelo llega con las baterías para los concesionarios del norte",
    );
    expect(keywords).not.toEqual(
      expect.arrayContaining(["con", "las", "los", "del", "para", "este"]),
    );
    expect(keywords).toEqual(expect.arrayContaining(["concesionarios", "norte"]));
  });

  it("filters generic EV vocabulary that would cause false-positive matches", () => {
    const keywords = extractKeywords("Nuevo coche eléctrico con batería y autonomía mejorada");
    expect(keywords).not.toEqual(
      expect.arrayContaining(["nuevo", "coche", "electrico", "bateria", "autonomia"]),
    );
  });

  it("is case- and accent-insensitive", () => {
    expect(extractKeywords("XPENG")).toEqual(extractKeywords("xpeng"));
    expect(extractKeywords("Mercedes")).toContain("mercedes");
  });

  it("dedupes repeated tokens across multiple text fragments", () => {
    const keywords = extractKeywords("Xpeng Xpeng Mona", "Xpeng Mona L03 precio España");
    expect(keywords.filter((k) => k === "xpeng")).toHaveLength(1);
    expect(keywords.filter((k) => k === "mona")).toHaveLength(1);
  });

  it("returns an empty array for null/undefined/empty input", () => {
    expect(extractKeywords(null, undefined, "")).toEqual([]);
  });

  it("folds synonymous self-driving terms into a shared topic tag", () => {
    const autonomo = extractKeywords(
      "El coche autónomo todavía no sabe reaccionar a esta situación",
    );
    const autopilot = extractKeywords(
      "Tesla estrena una función para limpiar las cámaras del Autopilot",
    );
    const waymo = extractKeywords("Waymo opera sin conductor en Las Vegas");
    expect(autonomo).toContain("topic:conduccion-autonoma");
    expect(autopilot).toContain("topic:conduccion-autonoma");
    expect(waymo).toContain("topic:conduccion-autonoma");
  });

  it("does not add a topic tag when no cluster term is present", () => {
    expect(extractKeywords("Xpeng presenta el Mona L03")).not.toContain(
      "topic:conduccion-autonoma",
    );
  });

  it("folds humanoid-robot terms (Iron, Optimus) into a shared topic tag", () => {
    const iron = extractKeywords("Xpeng Iron, más de 1.000 robots al mes para su lanzamiento");
    const optimus = extractKeywords(
      "Tesla desmonta la línea del Model S y Model X para fabricar Optimus",
    );
    expect(iron).toContain("topic:robots-humanoides");
    expect(optimus).toContain("topic:robots-humanoides");
  });

  it("does not match 'iron' as a substring inside an unrelated word", () => {
    expect(extractKeywords("De Madrid a Girona sin recargar")).not.toContain(
      "topic:robots-humanoides",
    );
  });

  it("folds manufacturer-crisis terms into a shared topic tag", () => {
    const vw = extractKeywords(
      "Volkswagen podría recortar 100.000 empleos y cerrar 4 fábricas en una reestructuración radical",
    );
    const lucid = extractKeywords("Lucid despide al 18% de su personal en un nuevo despido");
    expect(vw).toContain("topic:crisis-fabricante");
    expect(lucid).toContain("topic:crisis-fabricante");
  });

  it("does not treat a price cut or a range loss as manufacturer-crisis coverage", () => {
    const priceCut = extractKeywords(
      "Tesla garantiza el valor de reventa tras los recortes de precios",
    );
    const rangeLoss = extractKeywords("Se habla de pérdidas repentinas de 200 km de autonomía");
    expect(priceCut).not.toContain("topic:crisis-fabricante");
    expect(rangeLoss).not.toContain("topic:crisis-fabricante");
  });

  it("filters bare future-year tokens as generic noise", () => {
    const keywords = extractKeywords(
      "Xpeng aspira a fabricar robots antes de su lanzamiento en 2027",
    );
    expect(keywords).not.toContain("2027");
    expect(keywords).toContain("robots");
  });

  it("filters the thousands-separator '000' artifact", () => {
    const keywords = extractKeywords("Xpeng aspira a fabricar más de 1.000 robots al mes");
    expect(keywords).not.toContain("000");
    expect(keywords).toContain("robots");
  });

  it("folds ES/EN battery-degradation terms into a shared topic tag", () => {
    const spanish = extractKeywords(
      "Las baterías LFP ganan esta comparativa de degradación en el Tesla Model 3",
    );
    const english = extractKeywords("2016 Tesla Model S 85D battery degradation test");
    expect(spanish).toContain("topic:degradacion-bateria");
    expect(english).toContain("topic:degradacion-bateria");
  });
});

describe("searchTermsFor", () => {
  it("expands a matched topic tag into its full synonym list", () => {
    const keywords = extractKeywords("El coche autónomo todavía no sabe reaccionar");
    const terms = searchTermsFor(keywords);
    expect(terms).toContain("waymo");
    expect(terms).toContain("autopilot");
    expect(terms).toContain("fsd");
    expect(terms).not.toContain("topic:conduccion-autonoma");
  });

  it("keeps plain keywords untouched when no topic tag is present", () => {
    expect(searchTermsFor(["xpeng", "mona", "l03"])).toEqual(
      expect.arrayContaining(["xpeng", "mona", "l03"]),
    );
  });

  it("drops a plural/variant term already covered by a shorter one via substring", () => {
    const keywords = extractKeywords("La ONU da un paso histórico con los coches autónomos");
    const terms = searchTermsFor(keywords);
    expect(terms).toContain("autonomo");
    expect(terms).not.toContain("autonomos");
  });
});

describe("relatedArticleScore", () => {
  it("weighs keyword overlap more heavily than a same-category match", () => {
    const current = new Set(["xpeng", "mona"]);
    const keywordMatchDifferentCategory = relatedArticleScore(["xpeng"], current, false);
    const sameCategoryNoOverlap = relatedArticleScore(["mercedes"], current, true);
    expect(keywordMatchDifferentCategory).toBeGreaterThan(sameCategoryNoOverlap);
  });

  it("adds a smaller category bonus on top of keyword overlap", () => {
    const current = new Set(["xpeng"]);
    expect(relatedArticleScore(["xpeng"], current, true)).toBe(3);
    expect(relatedArticleScore(["xpeng"], current, false)).toBe(2);
  });

  it("falls back to the category bonus alone when there's no keyword overlap", () => {
    const current = new Set(["xpeng"]);
    expect(relatedArticleScore(["mercedes"], current, true)).toBe(1);
    expect(relatedArticleScore(["mercedes"], current, false)).toBe(0);
  });
});
