import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** Shown while it works. Keep it short and in the same tense as `label`. */
  runningLabel: string;
  running: boolean;
  /** Disable while there is nothing to work on, or another action is running. */
  disabled?: boolean;
  onClick: () => void;
  /** Supporting line beside the button, explaining what it will do here. */
  hint?: string;
  /**
   * Reserved width, sized for the longer of the two labels so nothing beside the
   * button shifts when it starts working.
   */
  minWidth?: string;
  buttonClassName?: string;
  className?: string;
}

/**
 * The house style for "let the AI do this bit": same icon, same secondary
 * weight, same idle → working treatment, whatever the task is.
 *
 * Used for "Desarrollar con IA" (create-idea drawer and the angle field) and for
 * "Mejorar SEO" on the headline. Keeping them one component is deliberate: if
 * the same gesture looked different in each place it would stop reading as the
 * same feature, and the panel would drift into three similar-but-different AI
 * buttons.
 */
export default function AiAssistButton({
  label,
  runningLabel,
  running,
  disabled,
  onClick,
  hint,
  minWidth = "11.5rem",
  buttonClassName,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button
        type="button"
        // `outline` and not `secondary` (Fer, 2026-07-25): secondary is a soft
        // grey fill with no border, and these buttons sit on tinted panels
        // (`bg-muted/40`), where it melts into the background. Outline brings a
        // border *and* its own background, so the button reads as a button
        // wherever it lands.
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={disabled || running}
        aria-live="polite"
        className={cn(
          "justify-center",
          // These buttons spend most of their life disabled — there is nothing
          // to send until a prompt is written — and the global
          // `disabled:opacity-50` washed the border out with the rest, so they
          // read as barely-there instead of as buttons waiting for input
          // (Fer, 2026-07-25). The border keeps its full strength and the
          // inactive state is carried by the text colour, which is enough to
          // tell them apart without making them disappear.
          "disabled:opacity-100 disabled:text-muted-foreground",
          buttonClassName,
        )}
        style={{ minWidth }}
      >
        {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {running ? runningLabel : label}
      </Button>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
