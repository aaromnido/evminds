import { Check } from "lucide-react";

interface Props {
  /** Fields in this block already copied, with their current content. */
  done: number;
  /** Fields in this block that have something to copy. Empty ones don't count. */
  total: number;
}

/**
 * "3 de 5 copiados" beside a block's title.
 *
 * The per-field tick already says which one you have done; this says whether you
 * have finished a **block**, which is the question you actually have while
 * scrolling past one you filled in five minutes ago. Without it, the only way to
 * be sure is to re-read every field, and that is the work this screen exists to
 * remove.
 *
 * Empty fields are excluded from the total on purpose: `Meta título` and
 * `Meta descripción` are normally left blank, so counting them would leave a
 * block permanently short of complete and quietly teach you to ignore the number.
 */
export default function CopyProgress({ done, total }: Props) {
  if (total === 0) return null;

  const complete = done === total;

  return (
    <span
      className="flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
      style={
        complete
          ? {
              backgroundColor: `color-mix(in oklab, var(--ev-tone-green) 18%, var(--background))`,
              color: `color-mix(in oklab, var(--ev-tone-green) 45%, var(--foreground))`,
            }
          : { color: "var(--muted-foreground)" }
      }
    >
      {complete && <Check className="size-3" />}
      {done} de {total} copiados
    </span>
  );
}
