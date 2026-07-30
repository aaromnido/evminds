/**
 * Remaining mock data for the editorial admin prototype (task A3).
 *
 * Only the image side is left mocked (Phase 6/Magnific isn't built yet). The
 * idea-generation half — `buildMockIdeas`, `buildOwnIdea`, their `SEEDS`
 * fixtures — is gone as of phase 5 (2026-07-28): `editorial-curator` and
 * `editorial_candidates` are real, see `src/lib/editorial-ideas.ts` and
 * `src/pages/admin/redaccion/curate-ideas.ts`.
 *
 * PROTOTYPE ONLY — delete what remains once Magnific is wired in (phase 6).
 */

/**
 * Hero image the prototype starts from, so the image block can be judged with
 * something in it instead of only as an empty drop zone. It is a real image
 * already in the repo; the real flow starts empty and Fer uploads his own.
 */
export const MOCK_HERO_IMAGE = "/images/articulos/0002/hero-nissan-micra.png";

/**
 * Fake "editar la imagen con IA": three variations to choose from.
 *
 * PROTOTYPE SHORTCUT — the variations are the same image with a CSS filter on
 * top, because the point right now is designing the pick-one-of-three flow, not
 * generating pixels. The real version calls Magnific with the prompt and
 * returns three genuine URLs, at which point `filter` disappears from this type.
 */
export interface MockImageVariant {
  id: string;
  url: string;
  /** CSS `filter` value that fakes the difference between variations. */
  filter: string;
  /** For screen readers only. Never shown: see `ImageVariantPicker`. */
  label: string;
}

export function mockImageVariants(url: string, prompt: string): MockImageVariant[] {
  const hint = prompt.trim().toLowerCase();
  const warm = hint.includes("cálid") || hint.includes("atardecer") || hint.includes("calid");

  return [
    {
      id: "v1",
      url,
      filter: warm ? "saturate(1.35) sepia(0.25)" : "saturate(1.2) contrast(1.05)",
      label: "Opción 1",
    },
    { id: "v2", url, filter: "contrast(1.15) brightness(1.05)", label: "Opción 2" },
    { id: "v3", url, filter: "saturate(0.55) brightness(1.08)", label: "Opción 3" },
  ];
}
