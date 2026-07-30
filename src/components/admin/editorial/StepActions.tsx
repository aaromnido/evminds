import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "a", "a y b", "a, b y c" — a list that reads like a sentence, not like a form. */
function joinInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

interface Props {
  label: string;
  runningLabel: string;
  running: boolean;
  onClick: () => void;
  /** Icon shown while idle. The running state always shows the spinner. */
  icon: React.ReactNode;
  /** Trailing icon, e.g. the arrow on a step that moves forward. */
  trailingIcon?: React.ReactNode;
  /** What is still missing. Empty means ready to go. */
  missing: string[];
  /** Opening of the "you still need to…" line. */
  missingPrefix: string;
  /** Reassurance shown when nothing is missing. */
  readyHint: string;
  /** Reserved width, sized for the longer of the two labels. */
  minWidth?: string;
  /**
   * Optional way out that does NOT finish the step — saving a draft, typically.
   *
   * It is not an alternative to the primary action, it is an escape from it, and
   * it stays `outline` and available even while the primary is blocked: you must
   * always be able to keep what you have written, even when it is not publishable
   * yet.
   */
  secondary?: {
    label: string;
    runningLabel: string;
    running: boolean;
    onClick: () => void;
    minWidth?: string;
    /**
     * Everything on screen is already stored, so there is nothing to save.
     *
     * Same three-state shape as `SaveIdeaButton`: the finished state gets a
     * dashed border and a check, not just lowered opacity, because opacity alone
     * reads as "not available now" when the message is "already done". Any edit
     * flips it back to the actionable label, which is what keeps it honest with
     * an autosave running underneath.
     */
    done?: boolean;
    doneLabel?: string;
    /** Blocked for its own reasons, independently of the primary action. */
    disabled?: boolean;
  };
}

/**
 * How every wizard step ends: **one** action, disabled while something is
 * missing, with the missing bit spelled out underneath.
 *
 * Disabling and explaining beats letting the click through and answering with an
 * error, which is the same information delivered after wasting a click.
 *
 * The only thing allowed beside it is an escape that does not finish the step
 * (see `secondary`), never a second way of finishing it: two comparable buttons
 * turn a step into a choice, and these steps have exactly one.
 */
export default function StepActions({
  label,
  runningLabel,
  running,
  onClick,
  icon,
  trailingIcon,
  missing,
  missingPrefix,
  readyHint,
  minWidth = "14rem",
  secondary,
}: Props) {
  const blocked = missing.length > 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="lg"
          onClick={onClick}
          disabled={blocked || running || secondary?.running}
          aria-live="polite"
          className="justify-center"
          style={{ minWidth }}
        >
          {running ? <Loader2 className="animate-spin" /> : icon}
          {running ? runningLabel : label}
          {!running && trailingIcon}
        </Button>

        {secondary && (
          <Button
            variant="outline"
            size="lg"
            onClick={secondary.onClick}
            disabled={running || secondary.running || secondary.done || secondary.disabled}
            aria-live="polite"
            className={cn(
              "justify-center",
              secondary.done && "border-dashed text-muted-foreground disabled:opacity-100",
            )}
            style={{ minWidth: secondary.minWidth ?? "12rem" }}
          >
            {secondary.running && <Loader2 className="animate-spin" />}
            {!secondary.running && secondary.done && <Check />}
            {secondary.running
              ? secondary.runningLabel
              : secondary.done
                ? (secondary.doneLabel ?? secondary.label)
                : secondary.label}
          </Button>
        )}
      </div>

      {blocked ? (
        <p className="text-xs text-muted-foreground">
          {missingPrefix}, {joinInSpanish(missing)}.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{readyHint}</p>
      )}
    </div>
  );
}
