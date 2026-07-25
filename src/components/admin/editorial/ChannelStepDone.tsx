import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChannelResultCard from "./ChannelResultCard";

interface Props {
  title: string;
  hint: string;
  /** Summary of the piece that was just finished. */
  piece: {
    title: string;
    imageUrl: string;
    imageFilter?: string;
    schedule: string;
    scheduleLabel: string;
  };
  /** Reopens the draft from the summary card. */
  onEdit: () => void;
  /** Where the finished piece can be seen, when this channel hosts one. */
  result?: { label: string; href: string };
}

/**
 * What the screen becomes once the piece has been handed off.
 *
 * Only ever shown for the **last** chosen channel: moving from one channel to
 * the next is the primary button of the step itself ("Seguir con X"), so a
 * multi-channel wizard never lands here mid-way — this is strictly the finish
 * line (Fer, 2026-07-26).
 *
 * A completion state instead of navigating away with a toast: the toast would
 * vanish in the page transition and nobody would read the one message that says
 * what to do next.
 *
 * **Which button is primary depends on there being somewhere to go.** When the
 * channel hosts the piece (EVminds), seeing it is the natural next move, so it
 * takes the primary and "Volver a Redacción" steps back to `outline`. When it
 * does not (Motor.es, where the piece lives in someone else's CMS), going back
 * is the only move left and stays primary rather than leaving the screen
 * without one.
 *
 * "Volver" always carries a **leading** left arrow: a back action with a
 * trailing right arrow points the wrong way and reads as going forward.
 */
export default function ChannelStepDone({ title, hint, piece, onEdit, result }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border p-12 text-center">
      <CircleCheck
        className="mb-4 size-14"
        strokeWidth={1}
        style={{ color: "var(--ev-tone-green)" }}
      />
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      <p className="mb-6 max-w-[52ch] text-base text-muted-foreground">{hint}</p>

      <ChannelResultCard {...piece} onEdit={onEdit} />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={result ? "outline" : "default"}
          size="lg"
          render={<a href="/admin/redaccion" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Volver a Redacción
        </Button>

        {result && (
          <Button size="lg" render={<a href={result.href} />}>
            {result.label}
            <ArrowRight data-icon="inline-end" />
          </Button>
        )}
      </div>
    </div>
  );
}
