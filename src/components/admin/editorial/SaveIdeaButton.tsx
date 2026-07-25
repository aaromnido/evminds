import { Bookmark, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The three labels share a reserved width so the row never reflows. */
const LABEL = {
  idle: "Guardar para otra ocasión",
  saving: "Guardando…",
  saved: "Guardada para otra ocasión",
} as const;

export type SaveState = keyof typeof LABEL;

interface Props {
  state: SaveState;
  onSave: () => void;
  /** Disable while another action on the same card is running. */
  disabled?: boolean;
  className?: string;
}

/**
 * "Guardar para otra ocasión" as a one-way button: idle → saving → saved.
 *
 * A toggle was tried first and dropped (Fer, 2026-07-25): it implied the save
 * could be switched back off, when in fact storing the idea is a commitment. Once
 * saved the button goes muted and unclickable, which says "done, nothing left to
 * do here" without needing a second control to undo it.
 */
export default function SaveIdeaButton({ state, onSave, disabled, className }: Props) {
  const saved = state === "saved";
  const saving = state === "saving";

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onSave}
      disabled={saved || saving || disabled}
      aria-live="polite"
      className={cn(
        "min-w-[15.5rem] justify-center",
        // Muted and inert once done: disabled already blocks the click, this makes
        // it *look* spent rather than merely unavailable.
        saved && "border-dashed text-muted-foreground disabled:opacity-100",
        className,
      )}
    >
      {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Bookmark />}
      {LABEL[state]}
    </Button>
  );
}
