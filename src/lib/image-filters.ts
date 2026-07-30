/**
 * House colour grades for hero images, baked into the Cloudinary URL (Phase 6A.2).
 *
 * **Why the URL and not CSS.** Press photos are published identically by every
 * outlet that downloads them, so a consistent grade is the cheapest way for an
 * EVminds image to be recognizably ours. A CSS `filter:` would only be browser
 * make-up inside the panel: the bytes stored in Cloudinary and served on the
 * article, in the RSS and in the social card would still be the untouched
 * original — a beautiful photo in the editor and the flat one everywhere that
 * matters. Cloudinary takes transformations as a path segment after `/upload/`,
 * so the grade is a pure string operation on a URL we already store: no
 * re-upload, no new API, no extra bytes through our server, and the effect
 * travels everywhere the URL goes.
 *
 * **Colour fidelity is editorial here, not a matter of taste.** This is a car
 * outlet: a heavy tint turns a green car teal and at that point the photo is
 * misreporting the paint colour. Every grade below is deliberately mild and none
 * carries an aggressive tint. Keep it that way.
 *
 * Not to be confused with `MockImageVariant.filter` in `editorial-mocks.ts`,
 * which fakes three AI variations with CSS and dies with Phase 6B/8. Different
 * job (deliberate personalization of one image vs. picking among three generated
 * ones) and different output (real URLs vs. CSS).
 */

export type ImageFilterId =
  "original" | "nitida" | "vivida" | "calida" | "fria" | "suave" | "bn" | "cine";

export interface ImageFilter {
  id: ImageFilterId;
  /** Named by editorial intent: the question is "what's wrong with this photo". */
  label: string;
  /** Cloudinary transformation, or null for the untouched original. */
  transform: string | null;
}

/**
 * Eight, not twenty. Three was genuinely too few, but past a handful choosing
 * stops being a glance and becomes a task. Each one answers a different
 * situation, and adding a ninth later is one line here.
 *
 * Every string was verified against the real account on 2026-07-29 (200 + a
 * genuinely different image) and measured against two real photos. Two notes
 * from that pass, so nobody re-derives them:
 *   - Chain with `/`, not `,`. `e_grayscale,e_contrast:10` silently drops the
 *     grayscale, because a comma joins parameters of ONE component.
 *   - `e_vibrance:40` (the value first sketched in the plan) is invisible in a
 *     thumbnail — a mean absolute difference of ~2/255 against the original,
 *     versus ~10 for the tinted grades. `:80` roughly doubles it and is still
 *     the fidelity-safe choice, since vibrance lifts muted colours and leaves
 *     already-saturated ones (the car's paint) alone.
 */
export const IMAGE_FILTERS: readonly ImageFilter[] = [
  { id: "original", label: "Original", transform: null },
  { id: "nitida", label: "Nítida", transform: "e_improve/e_sharpen:60" },
  { id: "vivida", label: "Vívida", transform: "e_vibrance:80" },
  { id: "calida", label: "Cálida", transform: "e_saturation:15/co_rgb:ff9a3c,e_colorize:12" },
  { id: "fria", label: "Fría", transform: "co_rgb:3c7aff,e_colorize:12/e_saturation:-10" },
  { id: "suave", label: "Suave", transform: "e_contrast:-15/e_brightness:8" },
  { id: "bn", label: "Blanco y negro", transform: "e_grayscale/e_contrast:10" },
  { id: "cine", label: "Cine", transform: "e_art:zorro" },
] as const;

export const DEFAULT_IMAGE_FILTER_ID: ImageFilterId = "original";

/**
 * Crop first, effect second — a filter computed over pixels that are then thrown
 * away is wasted work, and sharpening in particular behaves worse that way.
 *
 * 16:9 to match the big preview right above it, at twice the displayed size so
 * the thumbnails stay crisp on a retina screen.
 */
const PREVIEW_TRANSFORM = "c_fill,w_448,h_252";

const UPLOAD_MARKER = "/image/upload/";

/**
 * Splits a Cloudinary delivery URL around the point where transformations go.
 *
 * Returns null for anything that is not one — the wizard still hands out
 * `MOCK_HERO_IMAGE` (a same-origin placeholder) until 6B or a real upload, and
 * every helper here has to leave it alone rather than mangle it. Same defensive
 * reasoning as `describeImage()` skipping non-http(s) URLs in Phase 3.
 *
 * Matched on the host and the `/image/upload/` marker rather than on our own
 * cloud name: any `res.cloudinary.com` upload URL accepts transformations, and
 * keeping `PUBLIC_CLOUDINARY_CLOUD` out of it leaves these helpers pure and
 * testable without touching the environment.
 */
function splitUploadUrl(url: string): { head: string; tail: string } | null {
  if (!url.startsWith("https://res.cloudinary.com/")) return null;
  const at = url.indexOf(UPLOAD_MARKER);
  if (at === -1) return null;
  const head = url.slice(0, at + UPLOAD_MARKER.length);
  return { head, tail: url.slice(at + UPLOAD_MARKER.length) };
}

/** Every transformation this module knows how to put into a URL. */
function knownTransforms(): string[] {
  return IMAGE_FILTERS.map((f) => f.transform).filter((t): t is string => t !== null);
}

/**
 * The URL with any grade of ours stripped back off.
 *
 * This is what stops filters stacking: picking "Cálida" and then "Blanco y
 * negro" must produce the second one, not both chained on top of each other. It
 * strips by exact match against the transformations above, so it can only ever
 * remove something we put there — never a `w_600,f_auto` that came from
 * somewhere else.
 *
 * Deriving the base from the URL rather than remembering it in component state
 * also survives a page reload: reopening a piece whose stored image already
 * carries a grade still shows the strip in the right state.
 */
export function baseImageUrl(url: string): string {
  const split = splitUploadUrl(url);
  if (!split) return url;
  for (const transform of knownTransforms()) {
    if (split.tail.startsWith(`${transform}/`)) {
      return split.head + split.tail.slice(transform.length + 1);
    }
  }
  return url;
}

/** Which grade a URL currently carries; "original" when it carries none. */
export function activeImageFilterId(url: string): ImageFilterId {
  const split = splitUploadUrl(url);
  if (!split) return DEFAULT_IMAGE_FILTER_ID;
  for (const filter of IMAGE_FILTERS) {
    if (filter.transform && split.tail.startsWith(`${filter.transform}/`)) {
      return filter.id;
    }
  }
  return DEFAULT_IMAGE_FILTER_ID;
}

function filterById(id: ImageFilterId): ImageFilter | undefined {
  return IMAGE_FILTERS.find((f) => f.id === id);
}

/**
 * The URL to store for a given grade. Always derived from the stripped base, so
 * it is safe to call with an already-filtered URL.
 */
export function applyImageFilter(url: string, id: ImageFilterId): string {
  const base = baseImageUrl(url);
  const filter = filterById(id);
  if (!filter?.transform) return base;

  const split = splitUploadUrl(base);
  if (!split) return base;
  return `${split.head}${filter.transform}/${split.tail}`;
}

/**
 * Small, real preview for the carousel: the same grade the article will get,
 * so what is shown is what gets published.
 */
export function imageFilterPreviewUrl(url: string, id: ImageFilterId): string {
  const base = baseImageUrl(url);
  const split = splitUploadUrl(base);
  if (!split) return base;

  const filter = filterById(id);
  const grade = filter?.transform ? `/${filter.transform}` : "";
  return `${split.head}${PREVIEW_TRANSFORM}${grade}/${split.tail}`;
}

/** Whether the filter strip has anything to offer for this image at all. */
export function supportsImageFilters(url: string): boolean {
  return splitUploadUrl(url) !== null;
}
