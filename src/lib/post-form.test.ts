import { describe, it, expect } from "vitest";
import { parsePostForm, validatePostForm } from "./post-form";

/** Build a FormData from a plain object for terse test setup. */
function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const validFields = {
  title: "Mi viaje en EV",
  slug: "mi-viaje-en-ev",
  excerpt: "Un resumen",
  content: "<p>Contenido real</p>",
  category: "Viaje",
  tags: "ev, viaje, tesla",
  status: "draft",
};

describe("parsePostForm", () => {
  it("trims fields and splits tags into a clean array", () => {
    const parsed = parsePostForm(fd({ ...validFields, title: "  Mi viaje en EV  " }));
    expect(parsed.payload.title).toBe("Mi viaje en EV");
    expect(parsed.payload.tags).toEqual(["ev", "viaje", "tesla"]);
  });

  it("returns an empty tags array when tags are absent", () => {
    const parsed = parsePostForm(fd({ ...validFields, tags: "" }));
    expect(parsed.payload.tags).toEqual([]);
  });

  it("maps empty optional image fields to null in the payload", () => {
    const parsed = parsePostForm(fd(validFields));
    expect(parsed.payload.image_url).toBeNull();
    expect(parsed.payload.image_alt).toBeNull();
  });

  it("treats an empty rich-text editor (<p></p>) as missing content", () => {
    const parsed = parsePostForm(fd({ ...validFields, content: "<p></p>" }));
    expect(parsed.missingFields).toContain("contenido");
  });

  it("collects all missing required fields", () => {
    const parsed = parsePostForm(fd({ status: "draft" }));
    expect(parsed.missingFields).toEqual(["título", "slug", "extracto", "contenido"]);
  });

  it("sets published_at to now when status is published with no date", () => {
    const parsed = parsePostForm(fd({ ...validFields, status: "published" }));
    expect(parsed.payload.published_at).not.toBeNull();
    expect(() => new Date(parsed.payload.published_at as string).toISOString()).not.toThrow();
  });

  it("converts a valid published_at (Madrid wall-clock) to its UTC instant", () => {
    // CET (UTC+1) in January: 10:00 Madrid → 09:00 UTC.
    const parsed = parsePostForm(fd({ ...validFields, published_at: "2026-01-20T10:00" }));
    expect(parsed.payload.published_at).toBe("2026-01-20T09:00:00.000Z");
  });

  it("accounts for CEST (UTC+2) in summer", () => {
    const parsed = parsePostForm(fd({ ...validFields, published_at: "2026-07-20T10:00" }));
    expect(parsed.payload.published_at).toBe("2026-07-20T08:00:00.000Z");
  });

  // Scheduling is always on the hour, same rule as the redacción wizard's
  // madridPublishInstant — whatever minute the picker sends is discarded
  // before it ever reaches the DB, regardless of the real time of saving.
  it("floors published_at to hh:00, discarding whatever minute was submitted", () => {
    const parsed = parsePostForm(fd({ ...validFields, published_at: "2026-01-20T10:37" }));
    expect(parsed.payload.published_at).toBe("2026-01-20T09:00:00.000Z");
  });

  it("also floors the repopulated form value, so a failed-submit re-render shows the truncated hour", () => {
    const parsed = parsePostForm(fd({ ...validFields, published_at: "2026-01-20T10:37" }));
    expect(parsed.values.published_at).toBe("2026-01-20T10:00");
  });

  // Regression caught in a past review: an invalid date must NOT throw RangeError
  // on toISOString(); it should leave payload null and let validate flag it.
  it("does not throw on an invalid published_at, leaves payload null", () => {
    expect(() => parsePostForm(fd({ ...validFields, published_at: "not-a-date" }))).not.toThrow();
    const parsed = parsePostForm(fd({ ...validFields, published_at: "not-a-date" }));
    expect(parsed.payload.published_at).toBeNull();
    // the raw bad value is preserved in values so the editor repopulates + validate catches it
    expect(parsed.values.published_at).toBe("not-a-date");
  });
});

describe("validatePostForm", () => {
  it("returns null for a valid form", () => {
    expect(validatePostForm(parsePostForm(fd(validFields)))).toBeNull();
  });

  it("reports missing required fields with a friendly message", () => {
    const msg = validatePostForm(parsePostForm(fd({ status: "draft" })));
    expect(msg).toMatch(/^Faltan campos obligatorios:/);
  });

  it("rejects an invalid category", () => {
    const msg = validatePostForm(parsePostForm(fd({ ...validFields, category: "NoExiste" })));
    expect(msg).toBe("Categoría no válida.");
  });

  it("rejects an invalid published_at with the friendly date message", () => {
    const msg = validatePostForm(parsePostForm(fd({ ...validFields, published_at: "not-a-date" })));
    expect(msg).toBe("Fecha de publicación no válida.");
  });
});
