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
        variant="secondary"
        size="sm"
        onClick={onClick}
        disabled={disabled || running}
        aria-live="polite"
        className={cn("justify-center", buttonClassName)}
        style={{ minWidth }}
      >
        {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {running ? runningLabel : label}
      </Button>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
