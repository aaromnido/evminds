import { useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  /**
   * Where "back" lands. **Required, with no default** (phase 2b): a shared
   * component whose default destination is right for one screen is a trap in the
   * next one — it does not error, it just takes you somewhere else, which is
   * exactly the bug this had when it sent step ④ to the brief instead of step ③.
   */
  href: string;
  /**
   * True when there is typed work that leaving would throw away. Nothing is
   * persisted in these steps, so this is the only thing standing between a
   * mis-click and a rewritten brief.
   */
  dirty: boolean;
  /**
   * What the confirmation says. Defaults to step ②'s wording.
   *
   * They are props because the same button leaves three different places, and a
   * dialog that describes the wrong one is worse than no dialog: it was asking
   * "¿Salir sin generar el texto?" on the channel screens, where the text is
   * already generated and what would actually be lost is the draft (Fer,
   * 2026-07-26).
   */
  confirmTitle?: string;
  confirmDescription?: string;
  /**
   * Run before leaving, returning whether it is safe to go.
   *
   * This is how the channel screens stopped needing to warn about losing work:
   * they flush their autosave here, and only if that fails does the confirmation
   * appear — now describing something that is actually true. Without the prop the
   * button behaves as before, deciding from `dirty` alone.
   */
  onBeforeLeave?: () => Promise<boolean>;
  disabled?: boolean;
}

/**
 * The way back one step, wherever it is used.
 *
 * **It does not know where "back" is — the caller does**, and that is the point:
 * the destination was hardcoded to step ② and, pasted into the channel screens,
 * sent step ④ back to the brief instead of to step ③ (Fer, 2026-07-26).
 *
 * Shape and position copied from "Ver historial" in step ① (Fer, 2026-07-25):
 * `outline`, `size="lg"`, icon first, sitting in its own row under the step
 * indicator. It was first built as a quiet link above the stepper — the argument
 * being that going back is an escape and not an action — but consistency won,
 * and rightly: every screen in this section putting its secondary navigation in
 * the same place is worth more than the nuance, and the position under the
 * stepper keeps it away from the primary action anyway.
 *
 * It confirms only when something would be lost: with nothing typed it just
 * goes, and asking anyway would train the reflex of dismissing dialogs unread.
 */
export default function BackStepButton({
  href,
  dirty,
  confirmTitle = "¿Salir sin generar el texto?",
  confirmDescription = "Lo que has escrito en este paso todavía no se guarda en ningún sitio, así que se perderá. La idea de la que partiste sigue en su lista.",
  onBeforeLeave,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  function leave() {
    window.location.href = href;
  }

  async function handleClick() {
    if (!onBeforeLeave) {
      if (dirty) setOpen(true);
      else leave();
      return;
    }

    setLeaving(true);
    const safe = await onBeforeLeave();
    setLeaving(false);
    // Only ask when there is something real to warn about.
    if (safe) leave();
    else setOpen(true);
  }

  return (
    <>
      <Button variant="outline" size="lg" disabled={disabled || leaving} onClick={handleClick}>
        {leaving ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
        Volver atrás
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X />
              Seguir aquí
            </AlertDialogCancel>
            <AlertDialogAction onClick={leave}>
              <ArrowLeft />
              Salir de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
