import { useRef, useState } from "react";
import { Check, ClipboardCheck, Copy, Eye } from "lucide-react";
import AiAssistButton from "./AiAssistButton";
import ArticleReviewPanel, { type ReviewSession } from "./ArticleReviewPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DraftViewToggle, { type DraftView } from "./DraftViewToggle";
import MarkdownToolbar from "./MarkdownToolbar";
import VisualDraftEditor from "./VisualDraftEditor";
import { markdownToHtml } from "@/lib/markdown";

/** Everything the "Revisor" toggle and its docked panel need. State and the
 * actual Gemini call live in `PublishChannelStep`; this field only renders
 * what it's given. */
export interface ReviewFieldProps {
  open: boolean;
  onToggle: () => void;
  loading: boolean;
  error: string | null;
  session: ReviewSession | null;
  /** True once title/body changed since `session.reviewedKey`. */
  stale: boolean;
  onToggleFinding: (key: string) => void;
  onRerun: () => void;
}

interface Props {
  /** The CMS's own wording where there is one ("Cuerpo noticia"). */
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** True while the copied text still matches what the field holds. */
  copied?: boolean;
  /**
   * Receives what should go to the clipboard, already in the active format.
   *
   * Optional, and its absence hides the button: copying is the hand-off on
   * Motor.es, and on a channel we publish ourselves a prominent "Copiar"
   * invites exactly the misunderstanding the completion screen fights — that
   * something has to be pasted somewhere for the piece to go out.
   */
  onCopy?: (text: string) => void;
  onPreview: () => void;
  /** Set when previewing isn't possible yet, and says why. */
  previewBlockedReason?: string | null;
  /**
   * Asks for a fresh take on this field alone (Fer, 2026-07-27). Optional, and
   * its absence hides the button — a plain textarea has nothing to regenerate.
   * Only the body changes; the rest of the draft (title, entradilla, tags…)
   * stays exactly as it is.
   */
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** The Revisor AI toggle + docked panel. Not optional: it applies to both
   * channels the same way "Previsualizar" does. */
  review: ReviewFieldProps;
  disabled?: boolean;
}

/**
 * The article body, in its two editable views.
 *
 * Extracted from `DraftTextBlock` when step ③ stopped being "a headline and a
 * body": there the headline now lives in the headlines block, three fields up,
 * and the entradilla sits between them — so the body had to become a piece that
 * can be placed on its own.
 *
 * Markdown is the only stored format, whichever view is open. The visual view is
 * the default (Fer, 2026-07-25): the common case is reviewing a finished piece,
 * like any document editor, and the Markdown view is there when you want the
 * source. The copy button copies whatever view is open, which is the point of
 * having both — paste Markdown where Markdown is wanted, HTML where HTML is.
 *
 * **Motor.es wants HTML with no `<h1>`**, which is why subtitles here are `##`
 * and never `#`: their template already prints the headline.
 */
export default function DraftBodyField({
  label = "Texto",
  value,
  onChange,
  copied,
  onCopy,
  onPreview,
  previewBlockedReason,
  onRegenerate,
  regenerating,
  review,
  disabled,
}: Props) {
  const [view, setView] = useState<DraftView>("html");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visual = view === "html";
  const html = markdownToHtml(value);
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="draft-body">{label}</Label>
          <DraftViewToggle value={view} onChange={setView} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {words} palabra{words === 1 ? "" : "s"}
          </span>
          {onRegenerate && (
            <AiAssistButton
              label="Regenerar"
              runningLabel="Generando…"
              running={Boolean(regenerating)}
              disabled={disabled}
              onClick={onRegenerate}
              minWidth="8.5rem"
              buttonClassName="h-8"
            />
          )}
          <Button
            variant={review.open ? "secondary" : "outline"}
            size="sm"
            onClick={review.onToggle}
            disabled={disabled || !value.trim()}
          >
            <ClipboardCheck />
            Revisor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={disabled || Boolean(previewBlockedReason)}
            title={previewBlockedReason ?? undefined}
          >
            <Eye />
            Previsualizar
          </Button>
          {/* Reserved width: the label swaps and nothing beside it may move. */}
          {onCopy && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(visual ? html : value)}
              disabled={disabled || !value.trim()}
              className="min-w-[6.5rem] justify-center"
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
        </div>
      </div>

      {previewBlockedReason && (
        <p className="text-xs text-muted-foreground">{previewBlockedReason}</p>
      )}

      {/* Two columns only while the Revisor panel is open: the editor shrinks
          to make real room for it, never overlapping (Fer, 2026-08-03).
          `items-stretch` (the default, made explicit) lets the panel match
          the editor's real height; its own `max-h` (see `ArticleReviewPanel`)
          is the safety ceiling that keeps a long report from dragging the
          whole page down with it instead of just scrolling internally. */}
      <div className="flex items-stretch gap-4">
        <div className="grid min-w-0 flex-1 gap-2">
          {/* Two ways of editing the same text, never a read-only pane: the
              visual one writes on the finished piece, the Markdown one on the
              source. */}
          {visual ? (
            <VisualDraftEditor
              value={value}
              onChange={onChange}
              ariaLabel={label}
              disabled={disabled}
            />
          ) : (
            <>
              <MarkdownToolbar
                textareaRef={textareaRef}
                value={value}
                onChange={onChange}
                disabled={disabled}
              />
              <Textarea
                id="draft-body"
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                rows={22}
                className="font-mono text-xs leading-relaxed"
              />
            </>
          )}

          {!visual && (
            <p className="text-xs text-muted-foreground">
              Se guarda como texto plano con Markdown. Los subtítulos van con ##.
            </p>
          )}
        </div>

        {review.open && (
          <div className="w-[22rem] shrink-0">
            <ArticleReviewPanel
              loading={review.loading}
              error={review.error}
              session={review.session}
              stale={review.stale}
              onToggleFinding={review.onToggleFinding}
              onRerun={review.onRerun}
              onClose={review.onToggle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
