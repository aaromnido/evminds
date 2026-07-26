import { useRef, useState } from "react";
import { Check, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DraftViewToggle, { type DraftView } from "./DraftViewToggle";
import MarkdownToolbar from "./MarkdownToolbar";
import SeoTitleField from "./SeoTitleField";
import VisualDraftEditor from "./VisualDraftEditor";
import { markdownToHtml } from "@/lib/markdown";

interface Props {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  /** True right after the text was copied, so the button can say so. */
  copied?: boolean;
  /**
   * Receives what should go to the clipboard, already in the active format.
   *
   * Optional, and its absence hides the button: copying is the hand-off on
   * Motor.es, and on a channel we publish ourselves a prominent "Copiar el HTML"
   * invites exactly the misunderstanding the completion screen fights — that
   * something has to be pasted somewhere for the piece to go out.
   */
  onCopy?: (text: string) => void;
  onPreview: () => void;
  /** Set when previewing isn't possible yet, and says why. */
  previewBlockedReason?: string | null;
  /** True while "Mejorar SEO" is working on the headline. */
  improvingSeo: boolean;
  onImproveSeo: () => void;
  disabled?: boolean;
}

/**
 * The generated draft, editable.
 *
 * Markdown is the source of truth and the only thing stored; the HTML view is
 * generated from it for whichever CMS wants markup, and is read-only. Rich text
 * (the TipTap editor `posts` uses) is deliberately NOT used here: this content is
 * never rendered on evminds, it is handed over as source, and a WYSIWYG would
 * hide the very thing being handed over.
 *
 * The copy button copies whatever view is open, which is the point of having the
 * two: paste Markdown where Markdown is wanted, HTML where HTML is.
 */
export default function DraftTextBlock({
  title,
  body,
  onTitleChange,
  onBodyChange,
  copied,
  onCopy,
  onPreview,
  previewBlockedReason,
  improvingSeo,
  onImproveSeo,
  disabled,
}: Props) {
  // Visual by default (Fer, 2026-07-25): the common case is reviewing and
  // touching up a finished piece, like any document editor. Markdown is there
  // for when you want the source.
  const [view, setView] = useState<DraftView>("html");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const visual = view === "html";
  const html = markdownToHtml(body);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-5">
      {/* The SEO pass is offered again here (Fer, 2026-07-25): nothing forces
          you through it in step ②, so the step that actually publishes has to
          give you the last chance. */}
      <SeoTitleField
        id="draft-title"
        label="Titular"
        hint="Es el titular con el que se publica. Compruébalo antes de copiar."
        value={title}
        onChange={onTitleChange}
        improving={improvingSeo}
        onImprove={onImproveSeo}
        disabled={disabled}
      />

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="draft-body">Texto</Label>
            <DraftViewToggle value={view} onChange={setView} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {words} palabra{words === 1 ? "" : "s"}
            </span>
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
                onClick={() => onCopy(visual ? html : body)}
                disabled={disabled || !body.trim()}
                className="min-w-[9.5rem] justify-center"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copiado" : visual ? "Copiar el HTML" : "Copiar el texto"}
              </Button>
            )}
          </div>
        </div>

        {previewBlockedReason && (
          <p className="text-xs text-muted-foreground">{previewBlockedReason}</p>
        )}

        {/* Two ways of editing the same text, never a read-only pane: the visual
            one writes on the finished piece, the Markdown one on the source. */}
        {visual ? (
          <VisualDraftEditor value={body} onChange={onBodyChange} disabled={disabled} />
        ) : (
          <>
            <MarkdownToolbar
              textareaRef={textareaRef}
              value={body}
              onChange={onBodyChange}
              disabled={disabled}
            />
            <Textarea
              id="draft-body"
              ref={textareaRef}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              disabled={disabled}
              rows={22}
              className="font-mono text-xs leading-relaxed"
            />
          </>
        )}

        <p className="text-xs text-muted-foreground">
          {visual
            ? "Escribe directamente sobre el texto. Se guarda como Markdown, y en «Markdown» ves y editas la fuente."
            : "Se guarda como texto plano con Markdown. Los subtítulos van con ##."}
        </p>
      </div>
    </div>
  );
}
