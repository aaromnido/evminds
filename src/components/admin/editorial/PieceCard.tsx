import { ArrowRight, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PieceChannelBadge from "./PieceChannelBadge";
import { formatAge } from "@/lib/editorial-utils";
import { isStalePiece, type PieceSummary } from "@/lib/editorial-pieces";
import { cn } from "@/lib/utils";

interface Props {
  piece: PieceSummary;
  nowIso: string;
  /** Omit to hide deleting — the block on step ① only points at pieces. */
  onDelete?: (piece: PieceSummary) => void;
  deleting?: boolean;
}

/**
 * One piece in progress: what it is called, how each of its channels is doing,
 * and when it was last touched.
 *
 * Same card shell as `IdeaCard` (`rounded-xl border bg-card`) because it is read
 * the same way — you are choosing what to go back to, not scanning rows — and the
 * panel should not feel like it was assembled by two different people.
 */
export default function PieceCard({ piece, nowIso, onDelete, deleting = false }: Props) {
  const stale = isStalePiece(piece.updatedAt, nowIso);

  return (
    <article
      className={cn(
        "grid gap-3 rounded-xl border border-border bg-card p-5 transition-colors",
        "hover:border-foreground/25",
        deleting && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Editada {formatAge(nowIso, piece.updatedAt)}</span>
        {/* Flagged, never deleted: a piece is a written article, and a rule that
            quietly destroys work is a worse failure than a long list. */}
        {stale && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              backgroundColor: "color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))",
              color: "color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))",
            }}
          >
            <Clock className="size-3" />
            sin tocar hace tiempo
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold leading-snug tracking-tight">{piece.title}</h3>

      <div className="flex flex-wrap gap-2">
        {piece.channels.map((summary) => (
          <PieceChannelBadge key={summary.channel} summary={summary} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* A link rendered as a button, the same way `PostEditor` does it: it is
            navigation, so it must behave like a link (middle click, open in a new
            tab) even though it reads as the primary action. */}
        <Button size="lg" nativeButton={false} render={<a href={piece.href} />}>
          {piece.status === "done" ? "Abrir la pieza" : "Seguir escribiendo"}
          <ArrowRight data-icon="inline-end" />
        </Button>

        {/* Deleting lives where pieces are managed, not where you pick one to
            carry on with — the same split as "Redacción elige, Ideas gestiona". */}
        {onDelete && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onDelete(piece)}
            disabled={deleting}
            className="text-muted-foreground"
          >
            <Trash2 />
            Borrar
          </Button>
        )}
      </div>
    </article>
  );
}
