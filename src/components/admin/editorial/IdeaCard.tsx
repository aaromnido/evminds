import { ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import IdeaCardMeta from "./IdeaCardMeta";
import IdeaProseField from "./IdeaProseField";
import SaveIdeaButton, { type SaveState } from "./SaveIdeaButton";
import type { IdeaCandidate } from "@/lib/editorial-types";

interface Props {
  idea: IdeaCandidate;
  nowIso: string;
  /** "history" drops the actions and the countdown, keeping it read-only. */
  variant?: "actionable" | "history";
  /** True while this card's "escribir" action is in flight. */
  picking?: boolean;
  /** Progress of this card's save action. */
  saveState?: SaveState;
  onPick?: (idea: IdeaCandidate) => void;
  /** Omit to hide the save button (ideas that are already stored for good). */
  onSave?: (idea: IdeaCandidate) => void;
  onDismiss?: (idea: IdeaCandidate) => void;
}

/**
 * One idea, with everything needed to decide visible without a click: the
 * Spanish headline it would carry, the editorial angle, and why it is worth
 * writing now. Cards rather than table rows on purpose — Ideas is read to decide
 * where to spend hours of writing, not scanned for what to fix (see
 * `.claude/design/ai-editorial-agent-ui.md`).
 *
 * Three actions, and only two of them persist the idea: writing about it and
 * saving it for later keep it; discarding lets it disappear for good.
 */
export default function IdeaCard({
  idea,
  nowIso,
  variant = "actionable",
  picking = false,
  saveState = "idle",
  onPick,
  onSave,
  onDismiss,
}: Props) {
  const readOnly = variant === "history";

  return (
    <article
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-card p-5 transition-colors",
        readOnly ? "opacity-70" : "hover:border-foreground/25",
        picking && "border-foreground/40",
      )}
    >
      <IdeaCardMeta idea={idea} nowIso={nowIso} showExpiry={!readOnly} />

      {/* The headline uses the full card width: capping it at a reading measure
          made it wrap to two lines on wide screens for no reason. Only the prose
          below is measure-limited. */}
      <h3 className="text-lg font-semibold leading-snug tracking-tight">
        {idea.proposed_title_es}
      </h3>

      <div className="grid max-w-[78ch] gap-4">
        <IdeaProseField label="Ángulo">{idea.angle}</IdeaProseField>
        <IdeaProseField label="Por qué ahora">{idea.rationale}</IdeaProseField>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="lg"
            onClick={() => onPick?.(idea)}
            disabled={picking}
            aria-label={`Escribir sobre: ${idea.proposed_title_es}`}
          >
            {picking ? <Loader2 className="animate-spin" /> : null}
            {picking ? "Preparando…" : "Escribir sobre esto"}
            {!picking && <ArrowRight data-icon="inline-end" />}
          </Button>

          {/* Omitted for ideas already stored for good (saved earlier, or own). */}
          {onSave && (
            <SaveIdeaButton state={saveState} onSave={() => onSave(idea)} disabled={picking} />
          )}

          {/* Only for transient proposals. On a stored idea, "descartar" would be
              a delete of saved data wearing the same word as "no me interesa" —
              managing the bank belongs to the Ideas section, not to this picker. */}
          {onDismiss && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onDismiss(idea)}
              disabled={picking || saveState === "saving"}
              className="text-muted-foreground"
            >
              <X />
              Descartar
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
