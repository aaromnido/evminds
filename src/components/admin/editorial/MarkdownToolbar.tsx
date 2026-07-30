import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyMarkdownAction, type MarkdownAction } from "@/lib/markdown-edit";

const ACTIONS: { action: MarkdownAction; label: string; icon: React.ReactNode }[] = [
  { action: "bold", label: "Negrita", icon: <Bold /> },
  { action: "italic", label: "Cursiva", icon: <Italic /> },
  { action: "h2", label: "Subtítulo", icon: <Heading2 /> },
  { action: "h3", label: "Subtítulo menor", icon: <Heading3 /> },
  { action: "ul", label: "Lista", icon: <List /> },
  { action: "ol", label: "Lista numerada", icon: <ListOrdered /> },
  { action: "quote", label: "Cita", icon: <Quote /> },
  { action: "link", label: "Enlace", icon: <Link2 /> },
];

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Formatting buttons over the Markdown source.
 *
 * They write Markdown into the textarea rather than replacing it with a
 * rich-text editor. That is deliberate and it is the same reason `posts`' TipTap
 * is not used here: this text is pasted into someone else's CMS as source, so the
 * source has to stay visible and exact. A WYSIWYG would hide the very thing
 * being handed over.
 *
 * The selection is restored after every action, so you can chain them and keep
 * typing without hunting for the cursor.
 */
export default function MarkdownToolbar({ textareaRef, value, onChange, disabled }: Props) {
  function run(action: MarkdownAction) {
    const el = textareaRef.current;
    if (!el) return;

    const result = applyMarkdownAction(value, el.selectionStart, el.selectionEnd, action);
    onChange(result.value);

    // After React repaints with the new value, put the caret back where the
    // transformation left it.
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
      {ACTIONS.map(({ action, label, icon }) => (
        <Button
          key={action}
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => run(action)}
          disabled={disabled}
          title={label}
          aria-label={label}
          className="text-muted-foreground hover:text-foreground"
        >
          {icon}
        </Button>
      ))}
    </div>
  );
}
