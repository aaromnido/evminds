import { ExternalLink, PenLine } from "lucide-react";
import { sourceHostname } from "@/lib/editorial-utils";
import type { IdeaCandidate } from "@/lib/editorial-types";

interface Props {
  idea: IdeaCandidate;
}

/**
 * Read-only reminder of where the topic came from, shown above the editable
 * fields when arriving from a picked proposal.
 *
 * It exists to answer "what is the redactor grounding this on?" without leaving
 * the step: the source name, the reason it was proposed, and a link out to the
 * original. It is deliberately NOT editable — "por qué ahora" helped decide
 * whether to write the piece, it is not an instruction to the redactor, and
 * turning it into a third textarea would blur which field actually steers.
 */
export default function PickedIdeaNote({ idea }: Props) {
  const isOwn = idea.origin === "own";

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          {isOwn && <PenLine className="size-3.5" />}
          {isOwn ? "Idea propia" : idea.source_name}
        </span>
        {idea.source_url && (
          <a
            href={idea.source_url}
            target="_blank"
            rel="noreferrer noopener"
            title={idea.source_title ?? undefined}
            className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver la noticia original en {sourceHostname(idea.source_url)}
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {idea.rationale && (
        <p className="max-w-[78ch] text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Por qué ahora: </span>
          {idea.rationale}
        </p>
      )}
    </div>
  );
}
