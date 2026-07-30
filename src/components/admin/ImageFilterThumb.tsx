import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** Real Cloudinary render of this grade — never a CSS approximation. */
  previewUrl: string;
  selected: boolean;
  onSelect: () => void;
}

/**
 * One grade in `ImageFilterStrip`.
 *
 * Selection reuses the language Fer settled in Phase 0 for `ImageVariantPicker`
 * rather than inventing a second one: a check badge, an outline with a gap, and
 * the siblings dimmed. Three marks because each covers where another fails — the
 * badge can be missed on a busy image, the outline can get lost against a light
 * photo, and dimming alone would not say *which* one is chosen.
 *
 * Unlike that picker, these thumbnails **are** captioned. There, the three images
 * were whatever a prompt returned and a label would have described something the
 * model never promised; here the name ("Cálida", "Blanco y negro") is the answer
 * to "what's wrong with this photo", which is the reason you'd pick one at all.
 */
export default function ImageFilterThumb({ label, previewUrl, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={label}
      className={cn(
        // 224 px wide (Fer, 2026-07-29): at half that the milder grades were
        // there but you could not judge them, which is the only reason the
        // strip exists. Eight of these no longer fit any form column, so the
        // horizontal scroll stops being a fallback and becomes the layout.
        "group relative w-56 shrink-0 cursor-pointer snap-start text-left transition-all duration-200",
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        // Hover brings a dimmed sibling back to full: comparing again after
        // choosing is a normal thing to want.
        !selected && "opacity-60 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "overflow-hidden rounded-md border",
          selected ? "border-transparent" : "border-border group-hover:border-foreground/25",
        )}
        // An outline with a gap, not a flush border: a border against the image
        // reads as part of its frame, separated it reads as a selection.
        // Inline because `outline-none` on the button and an `outline-2` utility
        // are different tailwind-merge groups, so `outline-style: none` would win
        // and nothing would be drawn.
        style={
          selected ? { outline: "3px solid var(--foreground)", outlineOffset: "3px" } : undefined
        }
      >
        <img src={previewUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      </div>

      {selected && (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}

      <span
        className={cn(
          "mt-1.5 block truncate text-center text-xs",
          selected ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
