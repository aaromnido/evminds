import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Cycled while the redactor writes (Fer, 2026-07-27): the same idea as
 * Claude's own "thinking" trace, so the wait reads as "working" instead of
 * "stuck". Purely decorative — it says nothing real about what the model is
 * doing at that instant, unlike an actual reasoning trace.
 */
const PHRASES = [
  "Leyendo el brief…",
  "Pensando el ángulo…",
  "Repasando el estilo de la casa…",
  "Buscando las palabras justas…",
  "Vigilando que no se cuele un guion largo…",
  "Escribiendo el titular…",
  "Redactando el cuerpo…",
  "Puliendo los últimos detalles…",
];

const PHRASE_INTERVAL_MS = 1800;

/**
 * Delay before the manual escape hatch appears (2026-07-30, the stuck-piece
 * incident): a real call finishes in ~10-15s, so showing "Cancelar" earlier
 * would read as an invitation to bail on a perfectly healthy wait. Past this
 * point it's a reasonable signal something is actually stuck.
 */
const CANCEL_DELAY_MS = 15_000;

interface Props {
  /**
   * Lets the wait be escaped by hand instead of only ever timing out on its
   * own. Optional so this loader still works wherever `onCancel` isn't wired.
   */
  onCancel?: () => void;
}

/**
 * What both channel screens show while a real Gemini call is in flight.
 *
 * Replaces the old mock's instant fill: Motor.es used to generate its draft
 * synchronously the moment the screen mounted, which only worked because
 * there was no real call underneath. Now there is one, it takes a few
 * seconds, and this is the wait — a little robot instead of a bare spinner,
 * since a blank screen for several seconds reads as broken.
 */
export default function DraftGeneratingLoader({ onCancel }: Props) {
  const [index, setIndex] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setShowCancel(true), CANCEL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-16 text-center">
      <Bot className="size-9 animate-bounce text-accent-foreground" />
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {PHRASES[index]}
      </p>
      {showCancel && onCancel && (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X />
          Cancelar y reintentar
        </Button>
      )}
    </div>
  );
}
