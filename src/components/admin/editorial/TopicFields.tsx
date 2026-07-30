import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AiAssistButton from "./AiAssistButton";
import FieldError from "./FieldError";
import CountedTextField from "./CountedTextField";
import { SEO_TITLE_MAX, type BriefErrors } from "@/lib/editorial-validation";

interface Props {
  title: string;
  angle: string;
  onTitleChange: (value: string) => void;
  onAngleChange: (value: string) => void;
  /** Validation result for both fields, computed by the orchestrator. */
  errors: BriefErrors;
  /** True while "Desarrollar con IA" is working. */
  expanding: boolean;
  onExpand: () => void;
  /** True while "Mejorar SEO" is working. */
  improvingSeo: boolean;
  onImproveSeo: () => void;
  /** Lock the fields while the draft is being generated. */
  disabled?: boolean;
}

/**
 * The two fields that actually steer the piece: the headline it would carry and
 * the angle it would argue. Both are required — without them the redactor has
 * nothing to aim at and would invent the piece instead of writing yours.
 *
 * The angle is the whole point of step ②. It is the last moment to tell the
 * redactor where to aim before it writes, so it gets the big field, the explicit
 * hint and the AI helper — while the headline, which the redactor will rewrite
 * anyway, stays a single line.
 *
 * The same component serves both entry routes: arriving from a picked idea it is
 * prefilled and ready to submit, and starting from scratch it is empty but never
 * blank, because "Desarrollar con IA" turns one sentence into a full angle.
 *
 * **When errors show.** Only after leaving a field, and then live while fixing
 * it. Complaining about an empty field the moment the screen loads would tell
 * someone off for not having typed yet; waiting until they press the button
 * would be the "let it through and answer with an error" pattern the panel
 * avoids. Blur is the moment they said "done with this one".
 */
export default function TopicFields({
  title,
  angle,
  onTitleChange,
  onAngleChange,
  errors,
  expanding,
  onExpand,
  improvingSeo,
  onImproveSeo,
  disabled,
}: Props) {
  const [touched, setTouched] = useState({ title: false, angle: false });

  const canExpand = title.trim().length > 0 || angle.trim().length > 0;

  const titleError = touched.title ? errors.title : null;
  const angleError = touched.angle ? errors.angle : null;

  return (
    <div className="grid gap-5">
      <CountedTextField
        id="brief-title"
        label="Titular de partida"
        hint="Orienta al redactor. Podrás retocarlo en el paso siguiente."
        placeholder="Ej.: Lo que nadie te cuenta de cargar en autopista en agosto"
        value={title}
        onChange={onTitleChange}
        onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
        required
        // Our own target, not Motor.es': step ② is about steering the redactor,
        // and 60 is where Google cuts. Their CMS's 65 belongs to step ③.
        max={SEO_TITLE_MAX}
        counterOverTitle="Google suele cortar el titular por aquí en los resultados de búsqueda."
        assist={{
          label: "Mejorar SEO",
          runningLabel: "Mejorando…",
          running: improvingSeo,
          onClick: onImproveSeo,
        }}
        error={titleError}
        disabled={disabled}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="brief-angle">Qué quieres contar</Label>
        <Textarea
          id="brief-angle"
          value={angle}
          onChange={(e) => onAngleChange(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, angle: true }))}
          disabled={disabled}
          required
          aria-invalid={angleError ? true : undefined}
          aria-describedby={angleError ? "brief-angle-error" : undefined}
          rows={6}
          placeholder="Desde qué mirada lo cuentas, qué quieres dejar claro y qué prefieres no repetir."
        />
        <FieldError id="brief-angle-error" message={angleError} />
        <AiAssistButton
          label="Desarrollar con IA"
          runningLabel="Desarrollando…"
          running={expanding}
          disabled={disabled || !canExpand}
          onClick={onExpand}
          hint="Amplía lo que has escrito y le añade matices. Puedes editarlo todo después."
          className="pt-1"
        />
      </div>
    </div>
  );
}
