import { ArrowRight, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import IdeaCardMeta from "./IdeaCardMeta";
import IdeaProseField from "./IdeaProseField";
import SaveIdeaButton, { type SaveState } from "./SaveIdeaButton";
import type { IdeaCandidate } from "@/lib/editorial-types";

interface Props {
  idea: IdeaCandidate;
  nowIso: string;
  /** "history" mutes the card and hides the countdown pill — purely visual,
   * the actions shown are still whatever handlers are passed in. */
  variant?: "actionable" | "history";
  /** True while this card's "escribir" action is in flight. */
  picking?: boolean;
  /** Progress of this card's save action. */
  saveState?: SaveState;
  /** True while this card's delete is in flight. */
  deleting?: boolean;
  /** Omit to hide the primary action (history cards: already turned into a piece). */
  onPick?: (idea: IdeaCandidate) => void;
  /** Omit to hide the save button (ideas that are already stored for good). */
  onSave?: (idea: IdeaCandidate) => void;
  /** Only for transient proposals — see the note below. */
  onDismiss?: (idea: IdeaCandidate) => void;
  /** Ideas section only: edit the title/angle/rationale/links. */
  onEdit?: (idea: IdeaCandidate) => void;
  /** Ideas section only: remove it from the bank or the history for good. */
  onDelete?: (idea: IdeaCandidate) => void;
}

/**
 * One idea, with everything needed to decide visible without a click: the
 * Spanish headline it would carry, the editorial angle, and why it is worth
 * writing now. Cards rather than table rows on purpose — Ideas is read to decide
 * where to spend hours of writing, not scanned for what to fix (see
 * `.claude/design/ai-editorial-agent-ui.md`).
 *
 * Every action is independent of the others — each renders only if its handler
 * is passed, mirroring how `onSave`/`onDismiss` already worked before `onEdit`/
 * `onDelete` (Ideas section, phase 7) joined them. `variant` no longer gates
 * which buttons show; it only mutes the card and hides the expiry pill, so a
 * history card can still offer "Borrar" while looking closed.
 */
export default function IdeaCard({
  idea,
  nowIso,
  variant = "actionable",
  picking = false,
  saveState = "idle",
  deleting = false,
  onPick,
  onSave,
  onDismiss,
  onEdit,
  onDelete,
}: Props) {
  const readOnly = variant === "history";
  const hasActions = Boolean(onPick || onSave || onDismiss || onEdit || onDelete);

  return (
    <article
      className={cn(
        "grid gap-4 rounded-xl border border-border bg-card p-5 transition-colors",
        readOnly ? "opacity-70" : "hover:border-foreground/25",
        (picking || deleting) && "border-foreground/40",
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

      {hasActions && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onPick && (
            <Button
              size="lg"
              onClick={() => onPick(idea)}
              disabled={picking}
              aria-label={`Escribir sobre: ${idea.proposed_title_es}`}
            >
              {picking ? <Loader2 className="animate-spin" /> : null}
              {picking ? "Preparando…" : "Escribir sobre esto"}
              {!picking && <ArrowRight data-icon="inline-end" />}
            </Button>
          )}

          {/* Omitted for ideas already stored for good (saved earlier, or own). */}
          {onSave && (
            <SaveIdeaButton state={saveState} onSave={() => onSave(idea)} disabled={picking} />
          )}

          {/* Ideas section only: the bank manages its own text, the picker never does. */}
          {onEdit && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => onEdit(idea)}
              disabled={picking || deleting}
            >
              <Pencil />
              Editar
            </Button>
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

          {/* Ideas section only: a real, permanent delete — see `DeleteIdeaDialog`. */}
          {onDelete && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onDelete(idea)}
              disabled={deleting}
              className="text-muted-foreground"
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? "Borrando…" : "Borrar"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
