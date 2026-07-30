import { Check, ExternalLink, Loader2, RotateCw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sourceHostname } from "@/lib/editorial-utils";
import type { ReferenceLink, ReferenceLinkStatus } from "@/lib/editorial-types";

const LABEL: Record<ReferenceLinkStatus, string> = {
  reading: "Leyendo…",
  read: "Leído",
  failed: "No se pudo leer",
};

const ICON = {
  reading: Loader2,
  read: Check,
  failed: TriangleAlert,
} as const;

/**
 * Pill tones, same `color-mix` treatment as the expiry pill in `IdeaCardMeta`.
 *
 * A link that could not be read is **amber, not red**: nothing broke, the page
 * simply did not let itself be read. What it does need is a warning, because the
 * consequence is silent — that source will not be in the prompt, and the draft
 * will look just as confident without it.
 */
const TONE: Record<ReferenceLinkStatus, string | null> = {
  reading: null,
  read: "--ev-tone-green",
  failed: "--ev-tone-amber",
};

function pillStyle(status: ReferenceLinkStatus): React.CSSProperties | undefined {
  const tone = TONE[status];
  if (!tone) return undefined;
  return {
    backgroundColor: `color-mix(in oklab, var(${tone}) 18%, var(--background))`,
    color: `color-mix(in oklab, var(${tone}) 45%, var(--foreground))`,
  };
}

interface Props {
  link: ReferenceLink;
  onRetry: (link: ReferenceLink) => void;
  onRemove: (link: ReferenceLink) => void;
  disabled?: boolean;
}

/**
 * One documentation link with its reading state (requirement R1).
 *
 * The state is the reason this is a list and not a textarea of URLs: what you
 * need to know before generating is which sources actually made it into the
 * prompt. A failed link is never a dead end — it offers a retry and can be
 * removed on the spot.
 */
export default function ReferenceLinkRow({ link, onRetry, onRemove, disabled }: Props) {
  const Icon = ICON[link.status];

  return (
    <li className="grid gap-1.5 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer noopener"
          title={link.url}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <span className="truncate">{sourceHostname(link.url)}</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </a>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            !TONE[link.status] && "bg-muted text-muted-foreground",
          )}
          style={pillStyle(link.status)}
        >
          <Icon className={cn("size-3.5", link.status === "reading" && "animate-spin")} />
          {LABEL[link.status]}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {link.status === "failed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(link)}
              disabled={disabled}
              className="text-muted-foreground"
            >
              <RotateCw />
              Reintentar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(link)}
            disabled={disabled}
            aria-label={`Quitar ${link.url}`}
            className="text-muted-foreground"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* What was read, or why it couldn't be — the proof that the right thing
          went into the prompt. */}
      {(link.title || link.error) && (
        <p className="max-w-[78ch] pr-2 text-xs text-muted-foreground">
          {link.title ?? link.error}
        </p>
      )}
    </li>
  );
}
