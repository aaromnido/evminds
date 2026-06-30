import { describe, it, expect } from "vitest";
// categorize() lives in the Deno (Edge Function) tree but is pure TS with no
// Deno-specific imports, so vitest can import it directly. Keep this test in
// parity with the category set in src/lib/categories.ts (6 values + Industria
// fallback) and the DB CHECK constraint on articles.category (mig. 46).
import { categorize } from "../../supabase/functions/scrape/services/categorizer";

describe("categorize", () => {
  it("maps a car keyword to 'Coches eléctricos'", () => {
    expect(categorize("Nuevo Tesla Model 3", "")).toBe("Coches eléctricos");
  });

  it("maps a battery keyword to 'Baterías y tecnología'", () => {
    expect(categorize("Avance en baterías", "Más autonomía")).toBe("Baterías y tecnología");
  });

  it("maps a renewables keyword to 'Renovables'", () => {
    expect(categorize("Energía solar récord", "")).toBe("Renovables");
  });

  it("maps a charging keyword to 'Infraestructura de carga'", () => {
    expect(categorize("Nuevo supercharger", "")).toBe("Infraestructura de carga");
  });

  it("maps a legislation keyword to 'Legislación y ayudas'", () => {
    expect(categorize("Nueva subvención para EVs", "")).toBe("Legislación y ayudas");
  });

  it("maps an industry keyword to 'Industria'", () => {
    expect(categorize("Récord de producción", "")).toBe("Industria");
  });

  it("defaults to 'Industria' when no keyword matches", () => {
    expect(categorize("Lorem ipsum dolor", "sit amet")).toBe("Industria");
  });

  it("is case-insensitive", () => {
    expect(categorize("BYD CRECE", "")).toBe("Coches eléctricos");
  });

  it("matches keywords found in the excerpt, not only the title", () => {
    expect(categorize("Noticia destacada", "instalan un nuevo wallbox")).toBe(
      "Infraestructura de carga",
    );
  });

  it("respects category precedence (cars before industry on multi-match)", () => {
    // "tesla" (Coches) and "ventas" (Industria) both present → Coches wins (declared first).
    expect(categorize("Las ventas de Tesla suben", "")).toBe("Coches eléctricos");
  });
});
