import CardsSection from "./CardsSection";
import PieceCard from "./PieceCard";
import type { PieceSummary } from "@/lib/editorial-pieces";

interface Props {
  /** Already capped by the page: this component does not decide how many. */
  pieces: PieceSummary[];
  /** How many are unfinished in total, so the link can say what it opens. */
  total: number;
  nowIso: string;
}

/**
 * What you owe yourself, at the top of Redacción.
 *
 * **Why here and not in the sidebar** (decided with Fer, 2026-07-26): a piece in
 * progress is work you owe, not a suggestion, and if it is not the first thing
 * you see when you come in to write, you start a second piece about the same
 * thing. A sidebar entry would also sit there permanently announcing nothing on
 * the days there is nothing — this block simply is not rendered then.
 *
 * **Capped, like "Guardadas y propias".** Any list that only grows eventually
 * pushes what matters below the fold, and here what is below is the proposals
 * that expire in 48 h. The rest is one click away.
 *
 * No interactivity on purpose: it is cards and links, so the page renders it with
 * no `client:` directive and it ships zero JavaScript. Deleting lives in the full
 * list, which is where pieces are managed.
 */
export default function PiecesInProgress({ pieces, total, nowIso }: Props) {
  if (pieces.length === 0) return null;

  return (
    <CardsSection
      title="Lo que tienes a medias"
      hint="Piezas empezadas que puedes retomar donde las dejaste."
      count={total}
      action={
        total > pieces.length ? (
          <a
            href="/admin/redaccion/piezas"
            className="text-xs underline underline-offset-4 hover:no-underline"
          >
            Ver todas ({total})
          </a>
        ) : (
          <a
            href="/admin/redaccion/piezas"
            className="text-xs underline underline-offset-4 hover:no-underline"
          >
            Ver todas las piezas
          </a>
        )
      }
    >
      {pieces.map((piece) => (
        <PieceCard key={piece.id} piece={piece} nowIso={nowIso} />
      ))}
    </CardsSection>
  );
}
