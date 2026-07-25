import ImageDropZone from "@/components/admin/ImageDropZone";
import GenerateImagePanel from "./GenerateImagePanel";
import ImagePromptField from "./ImagePromptField";
import ImageVariantPicker from "./ImageVariantPicker";
import type { MockImageVariant } from "@/lib/editorial-mocks";

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** Prompt for retouching the uploaded image. */
  editPrompt: string;
  onEditPromptChange: (value: string) => void;
  editing: boolean;
  onEdit: () => void;
  /** Prompt for generating one from scratch, when there is no image yet. */
  generatePrompt: string;
  onGeneratePromptChange: (value: string) => void;
  generating: boolean;
  onGenerate: () => void;
  /** Variations returned by the last AI run, empty when there are none. */
  variants: MockImageVariant[];
  selectedVariantId: string | null;
  /** CSS filter of the chosen variation, so the big preview shows it too. */
  previewFilter?: string;
  onSelectVariant: (variant: MockImageVariant) => void;
  onDiscardVariants: () => void;
  disabled?: boolean;
}

/**
 * The hero image, which is **required to publish** (requirement R2) on both
 * channels.
 *
 * With nothing yet, the two ways of getting one sit side by side: upload on the
 * left, generate on the right. Once there is an image the block turns into a
 * single panel for improving *that* image, which is a different question.
 *
 * Upload keeps the left, reading-order slot: Fer's own photos are the
 * differentiator of this site, and generating is the fallback, not the default.
 *
 * The drop zone, the Cloudinary upload and the little Change / Download / Remove
 * buttons are the same `ImageDropZone` that Noticias and Artículos use, not a
 * copy of it.
 */
export default function HeroImageBlock({
  value,
  onChange,
  editPrompt,
  onEditPromptChange,
  editing,
  onEdit,
  generatePrompt,
  onGeneratePromptChange,
  generating,
  onGenerate,
  variants,
  selectedVariantId,
  previewFilter,
  onSelectVariant,
  onDiscardVariants,
  disabled,
}: Props) {
  const dropZone = (
    <ImageDropZone value={value} onChange={onChange} folder="posts" previewFilter={previewFilter} />
  );

  // Nothing yet: the two ways of getting an image, side by side and both
  // visible (Fer, 2026-07-25). Hiding the generator behind a button made it easy
  // to miss, and at this point they really are two equal answers to the same
  // question. Once there IS an image the question changes to "improve this one",
  // which is a different panel.
  //
  // No `items-start` on the grid: the two columns stretch to the same height so
  // their bottom edges line up (Fer, 2026-07-25). The panel's own content stays
  // pinned to the top (`content-start` inside it), so the extra height goes
  // below the button instead of spreading the fields apart.
  if (!value) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {dropZone}
        <GenerateImagePanel
          prompt={generatePrompt}
          onPromptChange={onGeneratePromptChange}
          running={generating}
          onGenerate={onGenerate}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {dropZone}

      <div className="grid gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <ImagePromptField
          id="image-edit-prompt"
          label="Retocarla con IA"
          placeholder="Ej.: luz de atardecer más cálida, fondo más limpio, sin la matrícula y con el coche un poco más centrado."
          value={editPrompt}
          onChange={onEditPromptChange}
          running={editing}
          onRun={onEdit}
          runLabel="Editar con IA"
          runningLabel="Editando…"
          hint="Parte de la imagen que has subido y te devuelve tres versiones."
          disabled={disabled}
        />

        {variants.length > 0 && (
          <ImageVariantPicker
            variants={variants}
            selectedId={selectedVariantId}
            onSelect={onSelectVariant}
            onDiscard={onDiscardVariants}
          />
        )}
      </div>
    </div>
  );
}
