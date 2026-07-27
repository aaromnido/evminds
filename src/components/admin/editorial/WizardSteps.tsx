import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublishChannel } from "@/lib/editorial-types";
import { newPieceUrl } from "@/lib/editorial-routes";

/**
 * The editorial wizard's steps. Step 4 (EVminds) only exists once the
 * dual-output roadmap item lands AND the channel is selected in step 2, so the
 * list is built per-render rather than being a fixed constant.
 */
export interface WizardStep {
  /** 1-based position, shown in the bubble while the step is still ahead. */
  n: number;
  label: string;
  /** Omitted for steps that aren't reachable yet (prototype/roadmap). */
  href?: string;
}

export const MVP_STEPS: WizardStep[] = [
  { n: 1, label: "Tema", href: newPieceUrl() },
  { n: 2, label: "Enfoque" },
  { n: 3, label: "Texto y publicación" },
];

const CHANNEL_LABEL: Record<PublishChannel, string> = {
  motor: "Motor.es",
  evminds: "EVminds",
};

/**
 * The steps for a given channel choice: one screen per channel, after the two
 * fixed ones. Publishing to both is what turns the wizard into four steps, so
 * ticking the second channel in step ② visibly grows the map above it — the
 * consequence of the choice is shown, not explained.
 *
 * With nothing chosen yet the generic third step stands in, so the indicator
 * never collapses to two while the user is deciding.
 */
export function buildWizardSteps(channels: PublishChannel[]): WizardStep[] {
  const ordered = (["motor", "evminds"] as const).filter((c) => channels.includes(c));
  const tail: WizardStep[] = ordered.length
    ? ordered.map((c, i) => ({ n: 3 + i, label: CHANNEL_LABEL[c] }))
    : [{ n: 3, label: "Texto y publicación" }];

  return [{ n: 1, label: "Tema", href: newPieceUrl() }, { n: 2, label: "Enfoque" }, ...tail];
}

/** Circle diameter, in px. The connector sits at exactly half of it. */
const BUBBLE_PX = 28;
/** Stroke weight shared by the circle borders and the connector track. */
const STROKE_PX = 3;

interface Props {
  steps?: WizardStep[];
  /** 1-based index of the step the user is on. */
  current: number;
  /**
   * The whole flow is finished: every step reads as done, none as active.
   *
   * Set by the completion screen (Fer, 2026-07-26). Without it the last step kept
   * its pencil and its filled-in label while the screen underneath said the piece
   * was already scheduled — the map contradicted the message right above it. An
   * explicit flag beats passing `current = steps.length + 1`, which would work but
   * read like an off-by-one.
   */
  complete?: boolean;
  className?: string;
}

interface ConnectorProps {
  side: "left" | "right";
  filled: boolean;
}

/**
 * Half of the line between two circles. Splitting each segment in two halves —
 * one owned by each neighbouring step — lets the steps stay evenly distributed
 * with plain flexbox, no measuring and no absolute-positioned track.
 */
function Connector({ side, filled }: ConnectorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute",
        side === "left" ? "left-0 w-1/2" : "left-1/2 w-1/2",
        filled ? "bg-foreground" : "bg-border",
      )}
      style={{ height: STROKE_PX, top: (BUBBLE_PX - STROKE_PX) / 2 }}
    />
  );
}

/**
 * Progress indicator for the editorial flow: numbered circles joined by a track
 * that fills in black as you advance, with the label under each circle.
 *
 * It orients, it doesn't drive — there is no "next" button here, advancing
 * happens through each screen's own primary action. Completed steps stay
 * clickable so you can go back (see `.claude/design/ai-editorial-agent-ui.md`).
 */
export default function WizardSteps({
  steps = MVP_STEPS,
  current,
  complete = false,
  className,
}: Props) {
  return (
    <nav aria-label="Progreso" className={className}>
      <ol className="flex items-start">
        {steps.map((step, i) => {
          const done = complete || step.n < current;
          const active = !complete && step.n === current;
          const isLast = i === steps.length - 1;
          const clickable = Boolean(step.href) && !active;

          const bubble = (
            <span
              className={cn(
                "relative z-10 flex items-center justify-center rounded-full border-solid transition-colors",
                done && "border-transparent bg-foreground text-background",
                active && "border-foreground bg-background text-foreground",
                !done && !active && "border-border bg-background text-muted-foreground",
              )}
              style={{ width: BUBBLE_PX, height: BUBBLE_PX, borderWidth: STROKE_PX }}
            >
              {done ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : active ? (
                <Pencil className="size-3.5" />
              ) : (
                <span className="text-xs font-semibold">{step.n}</span>
              )}
            </span>
          );

          const label = (
            <span
              className={cn(
                "text-center text-xs transition-colors sm:text-sm",
                active && "font-semibold text-foreground",
                done && "font-medium text-foreground",
                !done && !active && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          );

          return (
            <li key={step.n} className="relative flex flex-1 flex-col items-center gap-2">
              {i > 0 && <Connector side="left" filled={complete || step.n <= current} />}
              {!isLast && <Connector side="right" filled={complete || step.n < current} />}

              {clickable ? (
                <a
                  href={step.href}
                  className="flex flex-col items-center gap-2 rounded-md px-1 outline-none transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {bubble}
                  {label}
                </a>
              ) : (
                <div
                  className="flex flex-col items-center gap-2 px-1"
                  aria-current={active ? "step" : undefined}
                >
                  {bubble}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
