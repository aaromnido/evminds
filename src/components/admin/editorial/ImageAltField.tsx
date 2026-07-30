import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AiAssistButton from "./AiAssistButton";
import FieldError from "./FieldError";
import RequiredMark from "./RequiredMark";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** True while the AI is looking at the image. */
  describing: boolean;
  /** Describe the current image again, replacing whatever is in the field. */
  onDescribe: () => void;
  error?: string | null;
  disabled?: boolean;
}

/**
 * The hero image's alt text, right under the image it describes.
 *
 * **Placed here and not in the article-record block on purpose:** alt text
 * separated from its image is how alt text ends up describing the previous
 * photo. Whoever changes the image has to see this field move under their eyes.
 *
 * **Written by the AI from the image itself** (Fer, 2026-07-26), and re-written
 * whenever the image changes. This overrides an earlier call of mine to leave it
 * as the one manual field, on the grounds that the model had not seen the photo:
 * wrong, because the redactor model is multimodal, so describing the image is
 * exactly the kind of thing it can do better and more patiently than a person at
 * the end of a long screen. Fer hit the friction the manual version caused — an
 * empty required field 600 px above the button it was blocking — which is what
 * made the case.
 *
 * It stays editable and required: the AI's description is a starting point, and
 * an alt text is not optional on a hero image. The button re-describes on demand,
 * for when the automatic pass gets it wrong.
 */
export default function ImageAltField({
  value,
  onChange,
  onBlur,
  describing,
  onDescribe,
  error,
  disabled,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="image-alt">
        Texto alternativo de la imagen
        <RequiredMark />
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="image-alt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled || describing}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "image-alt-error" : undefined}
          placeholder={
            describing
              ? "La IA está mirando la imagen…"
              : "Ej.: un Nissan Micra eléctrico blanco cargando en un poste de calle."
          }
          className="min-w-[16rem] flex-1"
        />
        <AiAssistButton
          label="Describir la imagen"
          runningLabel="Mirando…"
          running={describing}
          disabled={disabled}
          onClick={onDescribe}
          minWidth="11.5rem"
          buttonClassName="h-8"
        />
      </div>
      <p className="max-w-[78ch] text-xs text-muted-foreground">
        Lo que se lee en voz alta a quien no puede ver la imagen, y lo que entiende Google. Lo
        escribe la IA mirando la foto; corrígelo si hace falta.
      </p>
      <FieldError id="image-alt-error" message={error} />
    </div>
  );
}
