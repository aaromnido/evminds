import { useState } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardsSection from "./CardsSection";
import DeletePieceDialog from "./DeletePieceDialog";
import PieceCard from "./PieceCard";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import type { PieceSummary } from "@/lib/editorial-pieces";

interface Props {
  pieces: PieceSummary[];
  nowIso: string;
}

/**
 * Every piece, in two groups: the ones still open and the ones already closed.
 *
 * **Sections rather than a filter control**, following step ①: the split is the
 * information (what you owe versus what you finished), and a filter would hide
 * one of the two behind a decision.
 *
 * **Finished pieces stay here forever, and nothing expires them.** They are the
 * only way back into a piece to move its date when Motor.es moves theirs — the
 * requirement that made durable drafts necessary — and a rule that deleted work
 * on a timer would be a much worse failure than a list that gets long. What the
 * list does instead is flag what has gone stale and let you delete it by hand.
 */
export default function PiecesList({ pieces: initial, nowIso }: Props) {
  const [pieces, setPieces] = useState(initial);
  const [pending, setPending] = useState<PieceSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  const open = pieces.filter((p) => p.status === "in_progress");
  const closed = pieces.filter((p) => p.status === "done");

  async function handleDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      const res = await fetch("/admin/redaccion/delete-piece", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pending.id }),
      });
      if (!res.ok) throw new Error(`delete-piece responded ${res.status}`);
      setPieces((prev) => prev.filter((p) => p.id !== pending.id));
      showToast("Pieza borrada.", "info");
      setPending(null);
    } catch (err) {
      console.error("no se pudo borrar la pieza:", err);
      // Never a dead end: the dialog stays open so retrying is one click.
      showToast("No se ha podido borrar. Inténtalo otra vez.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (pieces.length === 0) {
    return (
      <div className="grid gap-4 rounded-xl border border-dashed border-border p-8 text-center">
        <div className="grid gap-1">
          <h2 className="text-sm font-semibold tracking-tight">Todavía no hay ninguna pieza</h2>
          {/* An empty state that only says "nothing here" wastes the moment the
              user most needs direction, so it points at where pieces come from. */}
          <p className="text-sm text-muted-foreground">
            Las piezas nacen al generar el borrador desde Redacción, y se quedan aquí hasta que las
            borres.
          </p>
        </div>
        <div className="flex justify-center">
          <Button size="lg" render={<a href="/admin/redaccion" />}>
            <PenLine />
            Escribir algo nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CardsSection
        title="En curso"
        hint="Puedes retomarlas donde las dejaste."
        count={open.length}
      >
        {open.map((piece) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            nowIso={nowIso}
            onDelete={setPending}
            deleting={deleting && pending?.id === piece.id}
          />
        ))}
      </CardsSection>

      <CardsSection
        title="Terminadas"
        hint="Siguen abiertas: puedes cambiar el texto o la fecha cuando quieras."
        count={closed.length}
      >
        {closed.map((piece) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            nowIso={nowIso}
            onDelete={setPending}
            deleting={deleting && pending?.id === piece.id}
          />
        ))}
      </CardsSection>

      <DeletePieceDialog
        title={pending?.title ?? null}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPending(null)}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
