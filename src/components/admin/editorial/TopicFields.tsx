import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import AiAssistButton from "./AiAssistButton";
import FieldError from "./FieldError";
import { SEO_TITLE_MAX } from "@/lib/editorial-mocks";
import type { BriefErrors } from "@/lib/editorial-validation";

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
  const titleLength = title.trim().length;
  const tooLong = titleLength > SEO_TITLE_MAX;

  const titleError = touched.title ? errors.title : null;
  const angleError = touched.angle ? errors.angle : null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="brief-title">Titular de partida</Label>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="brief-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
            disabled={disabled}
            required
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "brief-title-error" : undefined}
            placeholder="Ej.: Lo que nadie te cuenta de cargar en autopista en agosto"
            className="min-w-[16rem] flex-1"
          />
          <AiAssistButton
            label="Mejorar SEO"
            runningLabel="Mejorando…"
            running={improvingSeo}
            disabled={disabled || titleLength === 0}
            onClick={onImproveSeo}
            minWidth="8.75rem"
            buttonClassName="h-8"
          />
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-muted-foreground">
            Orienta al redactor. Podrás retocarlo en el paso siguiente.
          </p>
          {titleLength > 0 && (
            // Google cuts the headline around 60 characters, so the count is
            // what makes "Mejorar SEO" checkable instead of an act of faith.
            // It is a warning, never a blocker: a long headline is worse SEO,
            // not an invalid brief.
            //
            // Over the limit it becomes an amber pill rather than amber text.
            // Amber text alone reads as dark brown once mixed toward
            // `--foreground` for contrast — the same problem the expiry labels
            // had before they became pills, solved the same way.
            <span
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                tooLong && "rounded-full px-2 py-0.5 font-medium",
              )}
              style={
                tooLong
                  ? {
                      backgroundColor: `color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))`,
                      color: `color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))`,
                    }
                  : undefined
              }
              title={
                tooLong
                  ? "Google suele cortar el titular por aquí en los resultados de búsqueda."
                  : undefined
              }
            >
              {titleLength}/{SEO_TITLE_MAX}
            </span>
          )}
        </div>

        <FieldError id="brief-title-error" message={titleError} />
      </div>

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
