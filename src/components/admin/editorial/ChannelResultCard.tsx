import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  imageUrl: string;
  /** CSS filter of the chosen AI variation, so the thumbnail matches the editor. */
  imageFilter?: string;
  /** Already-formatted line, e.g. "12/08/2026, 09:00". */
  schedule: string;
  /** "Programada" for what we publish, "Prevista" for what someone else does. */
  scheduleLabel: string;
  /**
   * The article's future URL, on the channel where we host it.
   *
   * Shown because it is the one field on this screen that cannot be changed for
   * free once published: everything else is editable later, a live URL is not.
   * This card exists to catch mistakes while going back still costs one click.
   */
  url?: string;
  /** Back to the draft, with everything exactly as it was left. */
  onEdit: () => void;
}

/**
 * A summary of the piece that was just finished, between the confirmation text
 * and the buttons (Fer, 2026-07-26).
 *
 * It exists because the completion screen was pure text: it told you the action
 * worked but showed nothing of *what* worked. Seeing the headline, the image and
 * the date together is what lets you catch, right there, that you scheduled the
 * wrong day or picked the wrong image variation.
 *
 * And "Editar" is the other half of that: spotting the mistake is only useful if
 * fixing it is one click away. It reopens the same draft in the same state
 * rather than navigating, so nothing typed is lost on the way back.
 */
export default function ChannelResultCard({
  title,
  imageUrl,
  imageFilter,
  schedule,
  scheduleLabel,
  url,
  onEdit,
}: Props) {
  return (
    <div className="mb-6 flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="size-20 shrink-0 rounded-lg object-cover"
          style={imageFilter ? { filter: imageFilter } : undefined}
        />
      )}
      <div className="grid min-w-0 gap-1">
        <p className="font-semibold leading-snug tracking-tight text-balance">{title}</p>
        {schedule && (
          <p className="text-sm text-muted-foreground">
            {scheduleLabel}: {schedule}
          </p>
        )}
        {url && <p className="truncate text-xs text-muted-foreground">{url}</p>}
      </div>

      <Button variant="outline" onClick={onEdit} className="ml-auto shrink-0">
        <Pencil />
        Editar
      </Button>
    </div>
  );
}
