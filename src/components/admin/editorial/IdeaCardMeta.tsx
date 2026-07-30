import { Bookmark, Clock, ExternalLink, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatAge, formatExpiry, sourceHostname, type ExpiryUrgency } from "@/lib/editorial-utils";
import type { IdeaCandidate, IdeaStatus } from "@/lib/editorial-types";

/**
 * Expiry pill palette. Built with `color-mix` over the tone CSS vars the news
 * editor already defines: the tint stays soft against the page background while
 * the text is pulled toward `--foreground` for contrast. Because both vars flip
 * with the theme, the same expression works in light and dark mode.
 */
const PILL_TONE: Record<ExpiryUrgency, string | null> = {
  calm: null, // neutral: plain muted pill, no alarm
  soon: "--ev-tone-amber",
  urgent: "--ev-tone-red",
  gone: null,
};

function expiryPillStyle(urgency: ExpiryUrgency): React.CSSProperties | undefined {
  const tone = PILL_TONE[urgency];
  if (!tone) return undefined;
  return {
    backgroundColor: `color-mix(in oklab, var(${tone}) 18%, var(--background))`,
    color: `color-mix(in oklab, var(${tone}) 45%, var(--foreground))`,
  };
}

const STATUS_LABEL: Record<IdeaStatus, string> = {
  pending: "Pendiente",
  picked: "Ya elegida",
  saved: "Guardada",
  rejected: "Descartada",
  expired: "Caducada",
};

interface Props {
  idea: IdeaCandidate;
  nowIso: string;
  /** Show the countdown (only meaningful for transient curator proposals). */
  showExpiry?: boolean;
}

/**
 * Card header line: where the idea comes from, how old it is, how long it has
 * left (or its resolved status), and a link out to the original article.
 */
export default function IdeaCardMeta({ idea, nowIso, showExpiry = true }: Props) {
  const expiry = formatExpiry(nowIso, idea.expires_at);
  const isOwn = idea.origin === "own";
  const withExpiry = showExpiry && !isOwn && idea.status === "pending";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
      {isOwn ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <PenLine className="size-3.5" />
          Idea propia
        </span>
      ) : (
        <span className="font-medium text-foreground">{idea.source_name}</span>
      )}

      <span aria-hidden="true">·</span>
      <span>{formatAge(nowIso, idea.fetched_at)}</span>

      {withExpiry && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            !PILL_TONE[expiry.urgency] && "bg-muted text-muted-foreground",
          )}
          style={expiryPillStyle(expiry.urgency)}
        >
          <Clock className="size-3.5" />
          {expiry.label}
        </span>
      )}

      {!withExpiry && idea.status !== "pending" && (
        <Badge variant="outline" className="h-5 gap-1">
          {idea.status === "saved" && <Bookmark className="size-3" />}
          {STATUS_LABEL[idea.status]}
        </Badge>
      )}

      {idea.source_url && (
        <a
          href={idea.source_url}
          target="_blank"
          rel="noreferrer noopener"
          title={idea.source_title ?? undefined}
          className="ml-auto inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          {sourceHostname(idea.source_url)}
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}
