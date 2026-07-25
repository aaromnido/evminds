import { useState } from "react";
import { ArrowLeft, X } from "lucide-react";
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

const HREF = "/admin/redaccion";

interface Props {
  /**
   * True when there is typed work that leaving would throw away. Nothing is
   * persisted in this step, so this is the only thing standing between a
   * mis-click and a rewritten brief.
   */
  dirty: boolean;
  disabled?: boolean;
}

/**
 * The way out of step ②, back to the topic list.
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
export default function BackStepButton({ dirty, disabled }: Props) {
  const [open, setOpen] = useState(false);

  function leave() {
    window.location.href = HREF;
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        disabled={disabled}
        onClick={() => (dirty ? setOpen(true) : leave())}
      >
        <ArrowLeft />
        Volver atrás
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin generar el texto?</AlertDialogTitle>
            <AlertDialogDescription>
              Lo que has escrito en este paso todavía no se guarda en ningún sitio, así que se
              perderá. La idea de la que partiste sigue en la lista.
            </AlertDialogDescription>
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
