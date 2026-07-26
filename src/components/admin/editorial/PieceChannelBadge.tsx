import { getChannel } from "@/lib/editorial-channels";
import { formatPublishSchedule } from "@/lib/editorial-utils";
import type { PieceChannelSummary } from "@/lib/editorial-pieces";

interface Props {
  summary: PieceChannelSummary;
}

/**
 * How one channel of a piece is doing, in three words and a date.
 *
 * The state is per channel and not per piece — Motor.es can be finished while
 * EVminds is still being written — so the card has to show one of these per
 * channel instead of a single label that would have to lie about one of them.
 *
 * The wording follows the rule the "hecho" screen already sets: we only say
 * "programada" where we are the ones publishing. On Motor.es the date is a
 * forecast of what somebody else will do, so it is "prevista".
 */
export default function PieceChannelBadge({ summary }: Props) {
  const spec = getChannel(summary.channel);
  const date = summary.publishDate ? formatPublishSchedule(summary.publishDate, "") : null;

  const state =
    summary.status === null
      ? "sin empezar"
      : summary.status === "draft"
        ? "en curso"
        : summary.status === "scheduled"
          ? "programada"
          : "terminada";

  // A soft tint for what is closed, plain muted for what is still open: the point
  // of the card is telling at a glance what is left to do.
  const closed = summary.status === "done" || summary.status === "scheduled";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      style={
        closed
          ? {
              backgroundColor: "color-mix(in oklab, var(--ev-tone-green) 18%, var(--background))",
              color: "color-mix(in oklab, var(--ev-tone-green) 45%, var(--foreground))",
            }
          : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
      }
    >
      <strong className="font-medium">{spec.name}</strong>
      <span>· {state}</span>
      {date && <span>· {date}</span>}
    </span>
  );
}
