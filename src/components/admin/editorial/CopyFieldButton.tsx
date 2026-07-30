import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** What this button copies, named for the screen reader ("el titular"). */
  what: string;
  /** True while the copied text still matches what the field holds. */
  copied: boolean;
  onCopy: () => void;
  /** Nothing to copy yet. */
  disabled?: boolean;
}

/**
 * Copy one field, and keep saying so.
 *
 * This is the small piece that makes step ③ work as a **reference sheet** rather
 * than a wall of text: with fourteen fields typed one by one into Motor.es' CMS,
 * the expensive question is not "how do I copy this" but **"which ones have I
 * already done"**. So the state is deliberately *not* a two-second flash like the
 * old whole-text copy button — it stays until it stops being true.
 *
 * "Stops being true" is the important half: the parent compares the copied text
 * with the field's current value, so editing a field silently drops its tick.
 * A tick beside a field that has changed since would be a confident lie in the
 * one place this screen is supposed to be trustworthy.
 *
 * **Icon only, no label** (Fer, 2026-07-26). Fourteen buttons on one screen all
 * saying "Copiar" is fourteen words to read past on a screen that is already
 * dense, and the word carries nothing the icon does not. It costs nothing in
 * legibility because the answer this button exists to give is a **glance down the
 * right-hand column**, and a tick reads faster than the word "Copiado" ever did.
 * What replaces the label:
 *
 * - the state is the **shape and the colour** — an outlined copy icon versus a
 *   green tick — which is the panel's rule for telling "available" from "already
 *   done" rather than leaning on opacity;
 * - `aria-label` still says the whole sentence, so nothing is lost for a screen
 *   reader, and a native `title` gives the same on hover. `title` and not a
 *   tooltip component on purpose: the counter next to it already explains itself
 *   that way, and this is not worth being the screen that introduces a second
 *   mechanism for hover text.
 */
export default function CopyFieldButton({ what, copied, onCopy, disabled }: Props) {
  const label = copied ? `${what}: copiado` : `Copiar ${what}`;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={onCopy}
      disabled={disabled}
      aria-live="polite"
      aria-label={label}
      title={label}
      className="shrink-0"
      style={
        copied
          ? {
              borderColor: "color-mix(in oklab, var(--ev-tone-green) 35%, var(--border))",
              color: "color-mix(in oklab, var(--ev-tone-green) 55%, var(--foreground))",
            }
          : undefined
      }
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
