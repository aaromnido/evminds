import ImagePromptField from "./ImagePromptField";

interface Props {
  prompt: string;
  onPromptChange: (value: string) => void;
  running: boolean;
  onGenerate: () => void;
  disabled?: boolean;
}

/**
 * Getting an image when you have none, beside the drop zone rather than behind a
 * button (Fer, 2026-07-25).
 *
 * The two are shown together because at that moment they really are two equal
 * answers to the same question: bring one, or make one. Hiding this one behind a
 * button made it easy to miss and added a step to the case where you have no
 * photo at all.
 *
 * It is not offered next to "Editar con IA": that panel only exists once there
 * IS an image, which is exactly when generating one from scratch is least
 * useful.
 */
export default function GenerateImagePanel({
  prompt,
  onPromptChange,
  running,
  onGenerate,
  disabled,
}: Props) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-muted/40 px-4 py-3">
      <ImagePromptField
        id="image-generate-prompt"
        label="Generar una imagen con IA"
        placeholder="Describe la imagen: qué se ve, desde dónde, con qué luz y en qué ambiente."
        value={prompt}
        onChange={onPromptChange}
        running={running}
        onRun={onGenerate}
        runLabel="Generar con IA"
        runningLabel="Generando…"
        hint="Te devuelve tres versiones para elegir."
        disabled={disabled}
        grow
      />
    </div>
  );
}
