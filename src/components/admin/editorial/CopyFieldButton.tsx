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
 * Width is reserved for the longer of the two labels, per the panel rule: a
 * button that resizes when its label swaps shoves its neighbours mid-click.
 */
export default function CopyFieldButton({ what, copied, onCopy, disabled }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCopy}
      disabled={disabled}
      aria-live="polite"
      aria-label={copied ? `${what}: copiado` : `Copiar ${what}`}
      className="h-7 min-w-[6.5rem] justify-center px-2 text-xs"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}
