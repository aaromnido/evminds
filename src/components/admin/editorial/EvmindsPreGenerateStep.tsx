import { Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import StepActions from "./StepActions";
import StepSection from "./StepSection";

interface Props {
  briefTitle: string;
  briefAngle: string;
  weeklyNotes: string;
  onWeeklyNotesChange: (value: string) => void;
  onGenerate: () => void;
  generating: boolean;
}

/**
 * What EVminds shows BEFORE it has a text of its own (Fer, 2026-07-27).
 *
 * Every other channel screen generates its draft the instant it is opened —
 * there is nothing to decide first. EVminds is the one exception: it is
 * written up to a week after Motor.es, adapting whatever happened since
 * (`weeklyNotes` — reader comments, a confirmed or denied figure, a new
 * number), and that note has to reach the prompt BEFORE the text exists, not
 * after. So this channel gets one explicit step first, the same shape as step
 * ②: read the brief, write the note if there is one, press "Generar". Motor.es
 * is untouched — it has no such note to wait for.
 *
 * Shown for a piece with no Motor.es channel at all too, on purpose: gating on
 * the channel combination would turn this into a second `if` to keep in sync
 * with `needsCmsFields`. The cost there is one harmless extra click on an
 * empty field.
 */
export default function EvmindsPreGenerateStep({
  briefTitle,
  briefAngle,
  weeklyNotes,
  onWeeklyNotesChange,
  onGenerate,
  generating,
}: Props) {
  return (
    <div className="grid gap-4">
      <StepSection
        title="Lo que vas a escribir"
        hint="El titular y el ángulo del brief, tal como se dejaron en el paso ②."
      >
        <div className="grid gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Titular de partida</p>
            <p className="text-sm">{briefTitle}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Ángulo</p>
            <p className="max-w-[78ch] text-sm leading-relaxed text-muted-foreground">
              {briefAngle}
            </p>
          </div>
        </div>
      </StepSection>

      <StepSection
        title="Qué ha cambiado esta semana"
        hint="Qué han comentado los lectores, qué dato se ha confirmado o desmentido, si ha salido una cifra nueva."
      >
        <div className="grid gap-1.5">
          <Textarea
            id="evminds-weekly-notes"
            aria-label="Qué ha cambiado esta semana"
            value={weeklyNotes}
            onChange={(e) => onWeeklyNotesChange(e.target.value)}
            disabled={generating}
            rows={4}
            placeholder="Opcional. Por ejemplo: varios lectores han preguntado por la autonomía real en invierno…"
          />
        </div>
      </StepSection>

      <StepActions
        label="Generar el borrador de EVminds"
        runningLabel="Escribiendo el borrador…"
        running={generating}
        onClick={onGenerate}
        icon={<Wand2 />}
        // Nothing here is required — the brief was already validated in step ②
        // and the note is optional — so there is never anything to list as
        // missing. The button is always ready.
        missing={[]}
        missingPrefix="Antes de generar"
        readyHint="Escribe la versión propia para EVminds, distinta de la de Motor.es. Podrás editarlo todo después."
        minWidth="16rem"
      />
    </div>
  );
}
