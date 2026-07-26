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
  /** The piece about to be deleted, or null when the dialog is closed. */
  title: string | null;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for deleting a piece.
 *
 * It confirms because this one really is unrecoverable: a piece is a written
 * article, its channel drafts go with it, and there is no undo to offer in a
 * toast the way there is for discarding an idea. That is the rule — irreversible
 * is an undo problem, and only when an undo is impossible does it become a dialog.
 *
 * Controlled and kept open while the delete runs, so the spinner is visible where
 * the click happened.
 */
export default function DeletePieceDialog({ title, deleting, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={title !== null} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar esta pieza?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borrará «{title}» y todo lo escrito para sus medios. No hay vuelta atrás. Si ya
            programaste el artículo en EVminds, ese artículo no se toca: se queda en Artículos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            <X />
            Dejarla como está
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={onConfirm}>
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {deleting ? "Borrando…" : "Borrar la pieza"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
