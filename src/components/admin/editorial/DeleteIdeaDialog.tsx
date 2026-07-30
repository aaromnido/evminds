import { Loader2, Trash2, X } from "lucide-react";
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
  /** The idea about to be deleted, or null when the dialog is closed. */
  title: string | null;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for deleting an idea from the bank or its history (Ideas
 * section, phase 7). Same shell as `DeletePieceDialog` and the same reason for
 * a modal over the picker's toast+undo: this is a real, permanent delete with
 * no undo window, and Fer's own call (2026-07-28) was that it should feel that
 * way, not like the picker's "descartar".
 *
 * Safe either way: `editorial_pieces.idea_id` has no foreign key (migration
 * 53), specifically so this can never cascade into a written piece.
 */
export default function DeleteIdeaDialog({ title, deleting, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={title !== null} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar esta idea?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará «{title}». No hay vuelta atrás. Si ya escribiste una pieza a partir de ella,
            esa pieza no se toca.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            <X />
            Dejarla como está
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {deleting ? "Borrando…" : "Borrar la idea"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
