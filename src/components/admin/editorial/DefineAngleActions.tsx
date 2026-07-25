import { ArrowRight, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "a", "a y b", "a, b y c" — a list that reads like a sentence, not like a form. */
function joinInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

interface Props {
  /** What is still missing before generating. Empty means ready to go. */
  missing: string[];
  generating: boolean;
  onGenerate: () => void;
}

/**
 * The end of step ②: one action, and it says what is missing before it works.
 *
 * "Generar el borrador" is disabled while something is missing and the missing
 * bit is spelled out underneath, rather than letting the click through and
 * answering with an error afterwards.
 *
 * Two things are deliberately absent:
 *
 * - **No "skip this step" button.** Arriving from a picked idea everything is
 *   already filled in and the channel defaulted, so this same button *is* the
 *   one-click shortcut. A second button that also generated would be two primary
 *   actions on a screen whose whole rule is that there is one.
 * - **No "guardar y seguir luego" (Fer, 2026-07-25).** It was built and then
 *   dropped: saving a half-finished brief needs a durable row and a list of
 *   pieces in progress to come back to, and neither exists in the MVP. A button
 *   that promises to keep your work and has nowhere to keep it is worse than not
 *   offering it.
 */
export default function DefineAngleActions({ missing, generating, onGenerate }: Props) {
  const blocked = missing.length > 0;

  return (
    <div className="grid gap-2">
      <div>
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={blocked || generating}
          aria-live="polite"
          className="min-w-[14rem] justify-center"
        >
          {generating ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {generating ? "Escribiendo el borrador…" : "Generar el borrador"}
          {!generating && <ArrowRight data-icon="inline-end" />}
        </Button>
      </div>

      {blocked ? (
        <p className="text-xs text-muted-foreground">Antes de generar, {joinInSpanish(missing)}.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tardará un momento. Podrás editar el texto entero antes de publicar nada.
        </p>
      )}
    </div>
  );
}
