import { Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Which list came up empty; changes the copy, not the layout. */
  view: "pending" | "history";
  onCreate?: () => void;
}

/**
 * Empty state for Ideas. Never a dead end: when there is nothing to pick, the
 * screen still offers the way forward (write your own idea), which is the
 * "no blank pages" rule from the design doc.
 */
export default function IdeasEmptyState({ view, onCreate }: Props) {
  if (view === "history") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
        <Lightbulb className="mb-4 size-14 text-muted-foreground/40" strokeWidth={1} />
        <p className="text-base text-muted-foreground">
          Aquí aparecerán las ideas sobre las que ya has escrito.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
      <Lightbulb className="mb-4 size-14 text-muted-foreground/40" strokeWidth={1} />
      <h3 className="mb-1 text-lg font-semibold">No hay ninguna idea en la lista</h3>
      <p className="mb-6 max-w-[48ch] text-base text-muted-foreground">
        Puedes pedir propuestas nuevas o escribir tu propia idea. Si ya sabes de qué quieres
        escribir, esto último es lo más rápido.
      </p>
      {onCreate && (
        <Button size="lg" onClick={onCreate}>
          <Plus />
          Crear una idea
        </Button>
      )}
    </div>
  );
}
