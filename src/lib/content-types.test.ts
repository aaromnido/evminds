import { describe, it, expect } from "vitest";
import { CONTENT_TYPES } from "./content-types";

describe("CONTENT_TYPES", () => {
  it("exposes the three content-type string constants", () => {
    expect(CONTENT_TYPES).toEqual({ NEWS: "news", VIDEO: "video", ARTICLE: "article" });
  });
});
