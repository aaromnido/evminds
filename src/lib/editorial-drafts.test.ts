import { describe, expect, it } from "vitest";
import {
  blankPayload,
  channelDraftFromRow,
  channelDraftToRow,
  parseChannelPayload,
  parseEvmindsPayload,
  parseMotorPayload,
} from "./editorial-drafts";
import { VALID_POST_CATEGORIES } from "./post-categories";

/**
 * These cover the seam between the wizard and its durable row. The interesting
 * cases are all "what the database hands back is not what this version of the app
 * would have written": a payload from an older build, a field that was renamed,
 * or plain junk. None of them may throw, because a screen that refuses to open
 * loses the whole piece while a blank field only loses one.
 */

describe("parseMotorPayload", () => {
  it("keeps every field it recognizes", () => {
    const payload = parseMotorPayload({
      listTitle: "Titular de listados",
      discoverTitle: "Titular de Discover",
      metaTitle: "Meta título",
      metaDescription: "Meta descripción",
      lead: "La **entradilla** en Markdown.",
      brand: "Nissan",
      model: "Micra",
      sourceName: "Electrek",
      sourceUrl: "https://electrek.co/algo",
      tags: ["Coches eléctricos", "Autonomía"],
    });

    expect(payload.listTitle).toBe("Titular de listados");
    expect(payload.lead).toBe("La **entradilla** en Markdown.");
    expect(payload.tags).toEqual(["Coches eléctricos", "Autonomía"]);
  });

  it("fills missing fields with empties instead of undefined", () => {
    const payload = parseMotorPayload({ listTitle: "Solo esto" });

    expect(payload.listTitle).toBe("Solo esto");
    expect(payload.discoverTitle).toBe("");
    expect(payload.metaTitle).toBe("");
    expect(payload.tags).toEqual([]);
  });

  it("survives junk without throwing", () => {
    for (const junk of [null, undefined, "una cadena", 42, [1, 2, 3]]) {
      expect(() => parseMotorPayload(junk)).not.toThrow();
      expect(parseMotorPayload(junk).lead).toBe("");
    }
  });

  it("drops values of the wrong type rather than coercing them", () => {
    const payload = parseMotorPayload({ brand: 7, tags: "Coches eléctricos" });

    expect(payload.brand).toBe("");
    // A string is not a tag list, and `["C","o","c"…]` would be worse than none.
    expect(payload.tags).toEqual([]);
  });

  it("keeps only the string members of a mixed tag array", () => {
    expect(parseMotorPayload({ tags: ["Carga", 3, null, "Precios"] }).tags).toEqual([
      "Carga",
      "Precios",
    ]);
  });

  it("ignores keys it does not know", () => {
    const payload = parseMotorPayload({ lead: "Entradilla", directorio: "Coches" });

    expect(payload.lead).toBe("Entradilla");
    expect(payload).not.toHaveProperty("directorio");
  });
});

describe("parseEvmindsPayload", () => {
  it("keeps a valid category", () => {
    expect(parseEvmindsPayload({ category: "Guía" }).category).toBe("Guía");
  });

  it("corrects a category that is not one of ours", () => {
    // Storing it would only fail later, at the `posts` insert, with nothing on
    // screen explaining why.
    expect(parseEvmindsPayload({ category: "Industria" }).category).toBe(VALID_POST_CATEGORIES[0]);
    expect(parseEvmindsPayload({}).category).toBe(VALID_POST_CATEGORIES[0]);
  });

  it("reads the record fields", () => {
    const payload = parseEvmindsPayload({
      slug: "seis-anos-en-electrico",
      excerpt: "Un extracto.",
      tags: ["carga"],
      imageAlt: "Un coche eléctrico blanco.",
    });

    expect(payload.slug).toBe("seis-anos-en-electrico");
    expect(payload.excerpt).toBe("Un extracto.");
    expect(payload.imageAlt).toBe("Un coche eléctrico blanco.");
  });
});

describe("parseChannelPayload / blankPayload", () => {
  it("parses per channel", () => {
    expect(parseChannelPayload("motor", { lead: "Hola" })).toHaveProperty("lead", "Hola");
    expect(parseChannelPayload("evminds", { slug: "hola" })).toHaveProperty("slug", "hola");
  });

  it("gives a usable starting point for a channel with no row yet", () => {
    expect(blankPayload("motor")).toHaveProperty("lead", "");
    expect(blankPayload("evminds")).toHaveProperty("category", VALID_POST_CATEGORIES[0]);
  });
});

describe("channelDraftFromRow / channelDraftToRow", () => {
  const row = {
    channel: "motor" as const,
    title: "Un titular",
    body: "## Un subtítulo\n\nUn párrafo.",
    image_url: "https://res.cloudinary.com/algo.webp",
    publish_date: "2026-08-05",
    payload: { lead: "La entradilla.", tags: ["Carga"] },
  };

  it("restores what was stored", () => {
    const state = channelDraftFromRow(row);

    expect(state.title).toBe("Un titular");
    expect(state.body).toBe("## Un subtítulo\n\nUn párrafo.");
    expect(state.imageUrl).toBe("https://res.cloudinary.com/algo.webp");
    expect(state.publishDate).toBe("2026-08-05");
    expect(state.payload).toHaveProperty("lead", "La entradilla.");
  });

  it("round-trips without losing anything", () => {
    expect(channelDraftToRow(channelDraftFromRow(row))).toEqual({
      title: row.title,
      body: row.body,
      image_url: row.image_url,
      publish_date: row.publish_date,
      payload: {
        listTitle: "",
        discoverTitle: "",
        metaTitle: "",
        metaDescription: "",
        lead: "La entradilla.",
        brand: "",
        model: "",
        sourceName: "",
        sourceUrl: "",
        tags: ["Carga"],
      },
    });
  });

  it("normalizes an empty date to null in both directions", () => {
    // A `date` column cannot take "", and a stored null must not come back as a
    // string the date input would reject.
    expect(channelDraftFromRow({ ...row, publish_date: "" }).publishDate).toBeNull();
    expect(
      channelDraftToRow({ ...channelDraftFromRow(row), publishDate: "" }).publish_date,
    ).toBeNull();
  });

  it("normalizes an empty image URL to null", () => {
    expect(channelDraftToRow({ ...channelDraftFromRow(row), imageUrl: "" }).image_url).toBeNull();
  });

  it("copies the payload instead of aliasing it", () => {
    const state = channelDraftFromRow(row);
    const written = channelDraftToRow(state);
    (written.payload as Record<string, unknown>).lead = "otra cosa";

    expect((state.payload as { lead: string }).lead).toBe("La entradilla.");
  });
});
