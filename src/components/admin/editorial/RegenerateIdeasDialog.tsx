import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Both labels of the confirm button live here so its reserved width stays
 * honest: the button must not resize between states, or the Cancel button next
 * to it slides sideways mid-click.
 */
const CONFIRM_IDLE = "Generar de nuevo";
const CONFIRM_RUNNING = "Generando ideas…";

interface Props {
  /** How many transient proposals would be thrown away. */
  pendingCount: number;
  running: boolean;
  onConfirm: () => void;
}

/**
 * "Volver a generar": asks the curator for a fresh batch when none of the
 * current proposals appeal.
 *
 * Confirmation exists because the current batch is *not* persisted — regenerating
 * loses it for good. The copy says so explicitly, and reassures that saved and
 * already-picked ideas are untouched.
 *
 * The dialog stays open while the batch is being generated, so the progress is
 * shown where the click happened instead of dumping the user back on the list
 * wondering whether anything is running. It closes itself when the work ends.
 */
export default function RegenerateIdeasDialog({ pendingCount, running, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const wasRunning = useRef(false);

  // Close once the generation that started from this dialog has finished.
  useEffect(() => {
    if (wasRunning.current && !running) setOpen(false);
    wasRunning.current = running;
  }, [running]);

  return (
    <AlertDialog
      open={open}
      // Locked while running: dismissing mid-generation would leave the work
      // going with no visible sign of it.
      onOpenChange={(next) => {
        if (!running) setOpen(next);
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="lg" disabled={running} className="min-w-[12rem]">
            {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {running ? CONFIRM_RUNNING : "Volver a generar"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Generar propuestas nuevas?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingCount > 0
              ? `Se descartarán las ${pendingCount} propuestas de esta lista y se buscarán otras. Las que hayas guardado o elegido no se tocan.`
              : "Se buscarán propuestas nuevas en las fuentes de siempre."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>
            <X />
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={running}
            // Reserves room for the longer of the two labels so the button keeps
            // its size and Cancel never shifts.
            className="min-w-[12rem]"
          >
            {running ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {running ? CONFIRM_RUNNING : CONFIRM_IDLE}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
