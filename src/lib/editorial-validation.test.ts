import { describe, expect, it } from "vitest";
import {
  ANGLE_MIN,
  BODY_MIN,
  CMS_LEAD_WORDS_MAX,
  CMS_META_DESCRIPTION_MAX,
  CMS_TAGS_MAX,
  CMS_TITLE_MAX,
  EXCERPT_MIN,
  isBriefValid,
  isChannelDraftValid,
  isPublishDatePast,
  TITLE_MIN,
  validateBrief,
  validateChannelDraft,
  type ChannelDraftInput,
} from "./editorial-validation";

const LONG_BODY = "x".repeat(BODY_MIN);

function draft(overrides: Partial<ChannelDraftInput> = {}): ChannelDraftInput {
  return {
    title: "Un titular suficientemente largo",
    body: LONG_BODY,
    imageUrl: "https://res.cloudinary.com/algo.webp",
    publishDate: "2026-08-05",
    ...overrides,
  };
}

describe("validateBrief", () => {
  it("accepts a headline and an angle with enough in them", () => {
    const errors = validateBrief("x".repeat(TITLE_MIN), "y".repeat(ANGLE_MIN));

    expect(isBriefValid(errors)).toBe(true);
  });

  it("asks for both when they are empty", () => {
    const errors = validateBrief("", "");

    expect(errors.title).toBeTruthy();
    expect(errors.angle).toBeTruthy();
    expect(isBriefValid(errors)).toBe(false);
  });

  it("rejects one character below each minimum", () => {
    const errors = validateBrief("x".repeat(TITLE_MIN - 1), "y".repeat(ANGLE_MIN - 1));

    expect(errors.title).toContain(String(TITLE_MIN));
    expect(errors.angle).toContain(String(ANGLE_MIN));
  });

  it("does not count surrounding whitespace as content", () => {
    const errors = validateBrief(`   ${"x".repeat(TITLE_MIN)}   `, "   ");

    expect(errors.title).toBeNull();
    expect(errors.angle).toBeTruthy();
  });
});

describe("validateChannelDraft", () => {
  it("passes a complete draft on a channel with no record of its own", () => {
    expect(isChannelDraftValid(validateChannelDraft(draft()))).toBe(true);
  });

  it("requires a headline, a body, an image and a day", () => {
    const errors = validateChannelDraft(
      draft({ title: " ", body: "", imageUrl: "", publishDate: "" }),
    );

    expect(errors.title).toBeTruthy();
    expect(errors.body).toBeTruthy();
    expect(errors.image).toBeTruthy();
    expect(errors.schedule).toBeTruthy();
  });

  it("rejects a body one character short of the minimum", () => {
    expect(validateChannelDraft(draft({ body: "x".repeat(BODY_MIN - 1) })).body).toBeTruthy();
    expect(validateChannelDraft(draft({ body: LONG_BODY })).body).toBeNull();
  });

  describe("the `posts` record (EVminds only)", () => {
    const record = {
      slug: "un-slug",
      excerpt: "x".repeat(EXCERPT_MIN),
      imageAlt: "Una descripción.",
    };

    it("stays silent when there is no record", () => {
      const errors = validateChannelDraft(draft());

      expect(errors.slug).toBeNull();
      expect(errors.excerpt).toBeNull();
      expect(errors.imageAlt).toBeNull();
    });

    it("accepts a complete record", () => {
      expect(isChannelDraftValid(validateChannelDraft(draft({ postRecord: record })))).toBe(true);
    });

    it("requires slug, excerpt and alt", () => {
      const errors = validateChannelDraft(
        draft({ postRecord: { slug: " ", excerpt: "", imageAlt: "  " } }),
      );

      expect(errors.slug).toBeTruthy();
      expect(errors.excerpt).toBeTruthy();
      expect(errors.imageAlt).toBeTruthy();
    });

    it("rejects an excerpt one character short", () => {
      const errors = validateChannelDraft(
        draft({ postRecord: { ...record, excerpt: "x".repeat(EXCERPT_MIN - 1) } }),
      );

      expect(errors.excerpt).toContain(String(EXCERPT_MIN));
    });
  });

  describe("the Motor.es record", () => {
    it("stays silent when there is none", () => {
      expect(validateChannelDraft(draft()).lead).toBeNull();
    });

    it("requires the entradilla, and only that", () => {
      // Their form marks exactly two fields required, `Título` and `Entradilla`.
      // Requiring anything else here would invent a rule their own CMS does not
      // have and block the button over a field they let you leave empty.
      const errors = validateChannelDraft(draft({ cmsRecord: { lead: "  " } }));

      expect(errors.lead).toBeTruthy();
      expect(
        isChannelDraftValid(validateChannelDraft(draft({ cmsRecord: { lead: "Hola" } }))),
      ).toBe(true);
    });
  });

  it("is invalid when ANY error is set", () => {
    // `isChannelDraftValid` walks the whole object precisely so that adding a new
    // error can never forget to join the check.
    const errors = validateChannelDraft(draft({ cmsRecord: { lead: "" } }));

    expect(isChannelDraftValid(errors)).toBe(false);
  });
});

describe("isPublishDatePast", () => {
  const TODAY = "2026-07-26";
  const HOUR = "08:00";

  it("is false where we do not control the hour", () => {
    // No `publishHour` means Motor.es: their system decides when it goes out, so
    // there is no such thing as "already past" from here.
    expect(isPublishDatePast(TODAY, undefined, TODAY, "23:00")).toBe(false);
  });

  it("is false with no date chosen yet", () => {
    expect(isPublishDatePast("", HOUR, TODAY, "23:00")).toBe(false);
  });

  it("is true for a day already gone", () => {
    expect(isPublishDatePast("2026-07-25", HOUR, TODAY, "06:00")).toBe(true);
  });

  it("is false for a future day whatever time it is now", () => {
    expect(isPublishDatePast("2026-07-27", HOUR, TODAY, "23:59")).toBe(false);
  });

  it("turns true today exactly at the publishing hour", () => {
    expect(isPublishDatePast(TODAY, HOUR, TODAY, "07:59")).toBe(false);
    expect(isPublishDatePast(TODAY, HOUR, TODAY, "08:00")).toBe(true);
    expect(isPublishDatePast(TODAY, HOUR, TODAY, "08:01")).toBe(true);
  });

  it("compares across a year boundary without parsing dates", () => {
    expect(isPublishDatePast("2026-12-31", HOUR, "2027-01-01", "00:30")).toBe(true);
  });
});

describe("Motor.es' recommended lengths", () => {
  /**
   * These are exact numbers from someone else's CMS, which is precisely the kind
   * of thing a later refactor "tidies up" — and then Fer's fields silently stop
   * matching what their editor checks against.
   */
  it("are the ones their form states", () => {
    expect(CMS_TITLE_MAX).toBe(65);
    expect(CMS_META_DESCRIPTION_MAX).toBe(155);
    expect(CMS_LEAD_WORDS_MAX).toBe(50);
    expect(CMS_TAGS_MAX).toBe(5);
  });
});
