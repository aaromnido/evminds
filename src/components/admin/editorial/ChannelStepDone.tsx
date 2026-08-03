import { CircleCheck, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChannelResultCard from "./ChannelResultCard";
import { newPieceUrl } from "@/lib/editorial-routes";

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
    /** Future URL, only where we host the piece. */
    url?: string;
  };
  /** Reopens the draft from the summary card. */
  onEdit: () => void;
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
 * **One action, and it starts the next piece** (Fer, 2026-07-26). Two earlier
 * versions were both wrong and for related reasons:
 *
 * - "Volver a Redacción" read as *going back a step*, because the wizard's own
 *   secondary button is called "Volver atrás". The word "volver" is already
 *   spoken for in this flow, and the destination is not a step back — it is the
 *   start of a new article. Hence **"Crear nuevo artículo"**, with the same
 *   `PenLine` icon the sidebar uses for Redacción, so the destination is
 *   recognisable before the click.
 * - "Versión EVminds", pointing at Artículos, stopped making sense once step ④
 *   became the screen that *creates* that very article: it offered to go and see
 *   the thing already summarised in the card right above it.
 */
export default function ChannelStepDone({ title, hint, piece, onEdit }: Props) {
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
        <Button size="lg" nativeButton={false} render={<a href={newPieceUrl()} />}>
          <PenLine />
          Crear nuevo artículo
        </Button>
      </div>
    </div>
  );
}
