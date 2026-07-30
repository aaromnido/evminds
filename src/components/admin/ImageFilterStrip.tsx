import {
  IMAGE_FILTERS,
  activeImageFilterId,
  applyImageFilter,
  imageFilterPreviewUrl,
} from "@/lib/image-filters";
import { cn } from "@/lib/utils";
import ImageFilterThumb from "./ImageFilterThumb";

interface Props {
  /** The image URL as currently stored, grade included. */
  value: string;
  /** Receives the URL to store, with the chosen grade baked in. */
  onChange: (url: string) => void;
  className?: string;
}

/**
 * The house grades for the hero image (Phase 6A.2).
 *
 * **Not decoration, differentiation.** Press photos are published identically by
 * every outlet that downloads them, so a consistent grade is the cheapest way for
 * an EVminds image to be recognizably ours. If one filter ends up being used
 * nearly always, that one *is* the house signature.
 *
 * Every thumbnail is the **real** Cloudinary render of that grade, not a CSS
 * approximation, so what is shown here is exactly what gets published — see
 * `src/lib/image-filters.ts` for why that distinction is the whole point of the
 * feature.
 */
export default function ImageFilterStrip({ value, onChange, className }: Props) {
  // Read the current grade back out of the URL instead of remembering it in
  // state: that way reopening a piece whose stored image already carries one
  // shows the strip in the right state, and every preview is derived from the
  // stripped base, so picking Cálida and then Blanco y negro replaces rather
  // than stacks.
  const selectedId = activeImageFilterId(value);

  return (
    <div className={cn("grid gap-2", className)}>
      <div>
        <p className="text-xs font-medium">Filtro de la casa</p>
        <p className="text-xs text-muted-foreground">
          Se guarda en la imagen publicada, no solo en esta vista previa.
        </p>
      </div>

      {/* Horizontal scroll on purpose: eight thumbnails do not fit a form column
          at a size you can judge by eye, and shrinking them until they do would
          defeat the point. The padding leaves room for the selected outline,
          which is drawn outside the button's box and would be clipped otherwise. */}
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-2">
        {IMAGE_FILTERS.map((filter) => (
          <ImageFilterThumb
            key={filter.id}
            label={filter.label}
            previewUrl={imageFilterPreviewUrl(value, filter.id)}
            selected={filter.id === selectedId}
            onSelect={() => onChange(applyImageFilter(value, filter.id))}
          />
        ))}
      </div>
    </div>
  );
}
