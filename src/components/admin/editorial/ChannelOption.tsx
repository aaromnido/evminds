import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  name: string;
  /** What publishing there actually involves, in one line. */
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * One publishing destination, as a selectable card.
 *
 * A native checkbox drives it (visually hidden, `sr-only`) instead of a button
 * with ARIA state: the keyboard behaviour, the label association and the form
 * semantics come for free, and the card is only its skin. There is no `checkbox`
 * primitive in `src/components/ui/` yet, and one card-shaped picker does not
 * justify adding one.
 */
export default function ChannelOption({
  id,
  name,
  description,
  checked,
  onChange,
  disabled,
}: Props) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 rounded-lg border p-4 transition-colors",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked ? "border-foreground/40 bg-muted/50" : "border-border hover:border-foreground/25",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />

      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4.5 items-center justify-center rounded border transition-colors",
          checked
            ? "border-foreground bg-foreground text-background"
            : "border-input bg-background",
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>

      <span className="grid gap-0.5">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
