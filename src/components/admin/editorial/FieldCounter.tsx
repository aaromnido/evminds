import { cn } from "@/lib/utils";

/** What is being counted. Motor.es' entradilla is the only field in words. */
export type CounterUnit = "chars" | "words";

interface Props {
  value: string;
  /** The recommended target. Going over is a warning, never an error. */
  max: number;
  unit?: CounterUnit;
  /** Shown on hover, saying what happens past the limit. */
  overTitle?: string;
  /** Shown on hover while inside the limit. */
  title?: string;
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * The `n/max` counter that every length-constrained field on this section wears.
 *
 * **A single recommended target, not a band.** Motor.es' CMS states its limits
 * exactly that way ("Recomendables 65", "Recomendables 155"), which is why there
 * is no green-in-the-middle control here: over the number is a warning, under it
 * is simply fine.
 *
 * Over the limit it becomes an **amber pill**, not amber text. Amber text was
 * tried on the headline counter and reads as olive-brown once mixed toward
 * `--foreground` for contrast (Fer, 2026-07-25: "no veo el 66/60 en ámbar"); the
 * tinted-background pill is how this panel already solves it, in step ①'s expiry
 * labels.
 */
export default function FieldCounter({ value, max, unit = "chars", overTitle, title }: Props) {
  const count = unit === "words" ? countWords(value) : value.trim().length;
  if (count === 0) return null;

  const over = count > max;

  return (
    <span
      className={cn(
        "text-xs tabular-nums text-muted-foreground",
        over && "rounded-full px-2 py-0.5 font-medium",
      )}
      style={
        over
          ? {
              backgroundColor: `color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))`,
              color: `color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))`,
            }
          : undefined
      }
      title={over ? overTitle : title}
    >
      {count}/{max}
      {unit === "words" && " palabras"}
    </span>
  );
}
