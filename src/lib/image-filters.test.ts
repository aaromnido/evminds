import { describe, it, expect } from "vitest";
import {
  IMAGE_FILTERS,
  applyImageFilter,
  baseImageUrl,
  activeImageFilterId,
  imageFilterPreviewUrl,
  supportsImageFilters,
} from "./image-filters";

const BASE = "https://res.cloudinary.com/aaromnido/image/upload/v1785195847/posts/foto.webp";
/** What the wizard hands out until 6B or a real upload. */
const MOCK = "/images/articulos/0002/hero-nissan-micra.png";

describe("IMAGE_FILTERS", () => {
  it("offers eight grades, with Original first and untransformed", () => {
    expect(IMAGE_FILTERS).toHaveLength(8);
    expect(IMAGE_FILTERS[0]?.id).toBe("original");
    expect(IMAGE_FILTERS[0]?.transform).toBeNull();
  });

  it("gives every other grade a transformation and a unique id", () => {
    const ids = new Set<string>();
    for (const filter of IMAGE_FILTERS) {
      expect(ids.has(filter.id)).toBe(false);
      ids.add(filter.id);
      if (filter.id !== "original") {
        expect(filter.transform).toBeTruthy();
      }
    }
  });
});

describe("applyImageFilter", () => {
  it("inserts the transformation right after /image/upload/", () => {
    expect(applyImageFilter(BASE, "bn")).toBe(
      "https://res.cloudinary.com/aaromnido/image/upload/e_grayscale/e_contrast:10/v1785195847/posts/foto.webp",
    );
  });

  it("returns the base URL untouched for Original", () => {
    expect(applyImageFilter(BASE, "original")).toBe(BASE);
  });

  it("replaces the previous grade instead of stacking it", () => {
    const warm = applyImageFilter(BASE, "calida");
    const cold = applyImageFilter(warm, "fria");
    expect(cold).toBe(applyImageFilter(BASE, "fria"));
    expect(cold).not.toContain("ff9a3c");
  });

  it("goes back to the exact original when Original is picked again", () => {
    const graded = applyImageFilter(BASE, "cine");
    expect(applyImageFilter(graded, "original")).toBe(BASE);
  });

  it("is idempotent: applying the same grade twice changes nothing", () => {
    const once = applyImageFilter(BASE, "nitida");
    expect(applyImageFilter(once, "nitida")).toBe(once);
  });

  it("leaves a non-Cloudinary URL alone", () => {
    expect(applyImageFilter(MOCK, "bn")).toBe(MOCK);
    expect(applyImageFilter("", "bn")).toBe("");
    expect(applyImageFilter("https://example.com/car.jpg", "bn")).toBe(
      "https://example.com/car.jpg",
    );
  });

  it("keeps transformations it did not put there", () => {
    const sized =
      "https://res.cloudinary.com/aaromnido/image/upload/w_600,f_auto,q_auto/v1/posts/foto.webp";
    expect(applyImageFilter(sized, "bn")).toBe(
      "https://res.cloudinary.com/aaromnido/image/upload/e_grayscale/e_contrast:10/w_600,f_auto,q_auto/v1/posts/foto.webp",
    );
  });
});

describe("baseImageUrl", () => {
  it("strips a grade of ours", () => {
    for (const filter of IMAGE_FILTERS) {
      expect(baseImageUrl(applyImageFilter(BASE, filter.id))).toBe(BASE);
    }
  });

  it("leaves an unfiltered or foreign URL alone", () => {
    expect(baseImageUrl(BASE)).toBe(BASE);
    expect(baseImageUrl(MOCK)).toBe(MOCK);
  });
});

describe("activeImageFilterId", () => {
  it("reads back the grade baked into a stored URL", () => {
    for (const filter of IMAGE_FILTERS) {
      expect(activeImageFilterId(applyImageFilter(BASE, filter.id))).toBe(filter.id);
    }
  });

  it("falls back to original for a plain or non-Cloudinary URL", () => {
    expect(activeImageFilterId(BASE)).toBe("original");
    expect(activeImageFilterId(MOCK)).toBe("original");
  });
});

describe("imageFilterPreviewUrl", () => {
  it("crops first and grades second", () => {
    expect(imageFilterPreviewUrl(BASE, "vivida")).toBe(
      "https://res.cloudinary.com/aaromnido/image/upload/c_fill,w_448,h_252/e_vibrance:80/v1785195847/posts/foto.webp",
    );
  });

  it("crops with no grade for Original", () => {
    expect(imageFilterPreviewUrl(BASE, "original")).toBe(
      "https://res.cloudinary.com/aaromnido/image/upload/c_fill,w_448,h_252/v1785195847/posts/foto.webp",
    );
  });

  it("previews from the base, never from an already-filtered URL", () => {
    const graded = applyImageFilter(BASE, "calida");
    expect(imageFilterPreviewUrl(graded, "bn")).toBe(imageFilterPreviewUrl(BASE, "bn"));
  });

  it("leaves a non-Cloudinary URL alone rather than mangling it", () => {
    expect(imageFilterPreviewUrl(MOCK, "bn")).toBe(MOCK);
  });
});

describe("supportsImageFilters", () => {
  it("is true only for Cloudinary delivery URLs", () => {
    expect(supportsImageFilters(BASE)).toBe(true);
    expect(supportsImageFilters(MOCK)).toBe(false);
    expect(supportsImageFilters("")).toBe(false);
    expect(supportsImageFilters("https://res.cloudinary.com/aaromnido/image/fetch/x.jpg")).toBe(
      false,
    );
  });
});
