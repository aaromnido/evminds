import { describe, it, expect } from "vitest";
import { getPostStatusBadge } from "./post-status";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();

describe("getPostStatusBadge", () => {
  it("returns 'Borrador' for a draft regardless of date", () => {
    const badge = getPostStatusBadge("draft", "2026-01-01T00:00:00Z", NOW);
    expect(badge.label).toBe("Borrador");
    expect(badge.variant).toBe("secondary");
  });

  it("returns 'Programado' for a published row with a future date", () => {
    const future = new Date("2026-12-31T00:00:00Z").toISOString();
    const badge = getPostStatusBadge("published", future, NOW);
    expect(badge.label).toBe("Programado");
    expect(badge.variant).toBe("outline");
  });

  it("returns 'Publicado' for a published row with a past date", () => {
    const past = new Date("2026-01-01T00:00:00Z").toISOString();
    const badge = getPostStatusBadge("published", past, NOW);
    expect(badge.label).toBe("Publicado");
    expect(badge.variant).toBe("default");
  });

  it("returns 'Publicado' for a published row with no date", () => {
    expect(getPostStatusBadge("published", null, NOW).label).toBe("Publicado");
  });
});
