import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

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
 * What both channel screens show while a real Gemini call is in flight.
 *
 * Replaces the old mock's instant fill: Motor.es used to generate its draft
 * synchronously the moment the screen mounted, which only worked because
 * there was no real call underneath. Now there is one, it takes a few
 * seconds, and this is the wait — a little robot instead of a bare spinner,
 * since a blank screen for several seconds reads as broken.
 */
export default function DraftGeneratingLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-16 text-center">
      <Bot className="size-9 animate-bounce text-accent-foreground" />
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
        {PHRASES[index]}
      </p>
    </div>
  );
}
