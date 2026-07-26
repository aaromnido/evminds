import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockImageVariant } from "@/lib/editorial-mocks";

interface Props {
  variants: MockImageVariant[];
  /** Id of the variation currently chosen, if any. */
  selectedId: string | null;
  onSelect: (variant: MockImageVariant) => void;
  onDiscard: () => void;
}

/**
 * The three variations the AI came back with, to pick one or keep the original.
 *
 * Three and not more on purpose: past that, choosing stops being a glance and
 * becomes a task. Keeping the original is always on offer, because "the AI
 * touched it so now you must use one" would be a trap.
 *
 * **The chosen one is marked three ways** (Fer, 2026-07-25): a check badge, an
 * outline with a gap around it, and the other two dimmed. That is not
 * redundancy for its own sake — each one covers where another fails. The badge
 * can be missed on a busy image, the outline can get lost against a light
 * photo, and the dimming alone would not say *which* is chosen if there were
 * only one left. Together, none of them has to carry it alone.
 *
 * **Thumbnails only, no captions** (Fer, 2026-07-25). Naming the variations
 * ("más viva", "más sobria") only made sense while they were filters; what comes
 * back from a prompt is three different images, and a label would be describing
 * something the model never promised. The image is the description.
 *
 * PROTOTYPE: the difference between variations is a CSS filter (see
 * `mockImageVariants`). The real version gets three URLs back from Magnific.
 */
export default function ImageVariantPicker({ variants, selectedId, onSelect, onDiscard }: Props) {
  const hasSelection = variants.some((v) => v.id === selectedId);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          const dimmed = hasSelection && !selected;
          return (
            <button
              key={variant.id}
              type="button"
              onClick={() => onSelect(variant)}
              aria-pressed={selected}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-lg border text-left transition-all duration-200",
                "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "border-transparent" : "border-border hover:border-foreground/25",
                // The others: dimmed, so the contrast is between siblings and
                // not inside one, which is what the eye catches without looking
                // for it. Hover brings one back to full, because comparing again
                // after choosing is a normal thing to want.
                dimmed && "opacity-55 hover:opacity-100",
              )}
              // The chosen one: a thick outline with a gap. A border flush
              // against the image reads as part of its frame; separated, it
              // reads as a selection. `outline` and not `ring` because the gap
              // then shows whatever is behind, with no offset colour to keep in
              // sync with this panel's tinted background.
              //
              // Inline and not a utility class: the base needs `outline-none`
              // for focus handling, and `outline-none` + `outline-2` both
              // survive `cn()` — they are different tailwind-merge groups — so
              // `outline-style: none` won and nothing was drawn.
              style={
                selected
                  ? { outline: "3px solid var(--foreground)", outlineOffset: "3px" }
                  : undefined
              }
            >
              <img
                src={variant.url}
                alt={variant.label}
                className="aspect-video w-full object-cover"
                style={{ filter: variant.filter }}
              />
              {selected && (
                <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onDiscard}
        className="w-fit cursor-pointer rounded-md text-xs text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ninguna, quedarme con la imagen original
      </button>
    </div>
  );
}
