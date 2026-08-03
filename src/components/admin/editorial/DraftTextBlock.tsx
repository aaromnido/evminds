import CountedTextField from "./CountedTextField";
import DraftBodyField, { type ReviewFieldProps } from "./DraftBodyField";
import { SEO_TITLE_MAX } from "@/lib/editorial-validation";

interface Props {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** True right after the text was copied, so the button can say so. */
  copied?: boolean;
  /** Absent hides the copy button. See `DraftBodyField`. */
  onCopy?: (text: string) => void;
  onPreview: () => void;
  /** Set when previewing isn't possible yet, and says why. */
  previewBlockedReason?: string | null;
  /** True while "Mejorar SEO" is working on the headline. */
  improvingSeo: boolean;
  onImproveSeo: () => void;
  /** Passed straight through to `DraftBodyField`. See its own docs. */
  review: ReviewFieldProps;
  disabled?: boolean;
}

/**
 * Headline plus body: the text block of a channel we publish ourselves (step ④).
 *
 * Step ③ no longer uses it. Mirroring Motor.es' form put three more headline
 * fields above the body and the entradilla between them, so that screen composes
 * `CountedTextField` and `DraftBodyField` itself in their CMS's order. Keeping
 * this component as the pairing of the two is what lets EVminds stay untouched
 * while step ③ was rearranged.
 *
 * The SEO pass is offered again here (Fer, 2026-07-25): nothing forces you
 * through it in step ②, so the step that actually publishes gives the last chance.
 */
export default function DraftTextBlock({
  title,
  body,
  onTitleChange,
  onBodyChange,
  copied,
  onCopy,
  onPreview,
  previewBlockedReason,
  improvingSeo,
  onImproveSeo,
  review,
  disabled,
}: Props) {
  return (
    <div className="grid gap-5">
      <CountedTextField
        id="draft-title"
        label="Titular"
        hint="Es el titular con el que se publica. Compruébalo antes de programar."
        value={title}
        onChange={onTitleChange}
        required
        max={SEO_TITLE_MAX}
        counterOverTitle="Google suele cortar el titular por aquí en los resultados de búsqueda."
        assist={{
          label: "Mejorar SEO",
          runningLabel: "Mejorando…",
          running: improvingSeo,
          onClick: onImproveSeo,
        }}
        disabled={disabled}
      />

      <DraftBodyField
        value={body}
        onChange={onBodyChange}
        copied={copied}
        onCopy={onCopy}
        onPreview={onPreview}
        previewBlockedReason={previewBlockedReason}
        review={review}
        disabled={disabled}
      />
    </div>
  );
}
