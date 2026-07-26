import { useRef, useState } from "react";
import { Check, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DraftViewToggle, { type DraftView } from "./DraftViewToggle";
import MarkdownToolbar from "./MarkdownToolbar";
import VisualDraftEditor from "./VisualDraftEditor";
import { markdownToHtml } from "@/lib/markdown";

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
   * Motor.es, and on a channel we publish ourselves a prominent "Copiar el HTML"
   * invites exactly the misunderstanding the completion screen fights — that
   * something has to be pasted somewhere for the piece to go out.
   */
  onCopy?: (text: string) => void;
  onPreview: () => void;
  /** Set when previewing isn't possible yet, and says why. */
  previewBlockedReason?: string | null;
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

      <p className="text-xs text-muted-foreground">
        {visual
          ? "Escribe directamente sobre el texto. Se guarda como Markdown, y en «Markdown» ves y editas la fuente."
          : "Se guarda como texto plano con Markdown. Los subtítulos van con ##."}
      </p>
    </div>
  );
}
