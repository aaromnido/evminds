import { Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCreate?: () => void;
}

/**
 * Empty state for step ①'s "Propuestas de hoy". Never a dead end: when there
 * is nothing to pick, the screen still offers the way forward (write your own
 * idea), which is the "no blank pages" rule from the design doc.
 *
 * Used to also cover Ideas' empty history view before phase 7 split the two
 * screens apart — Ideas builds its own empty state now, so this one only ever
 * has one shape.
 */
export default function IdeasEmptyState({ onCreate }: Props) {
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
