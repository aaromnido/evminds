import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markdownToHtml } from "@/lib/markdown";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import ImageUploadDialog from "../ImageUploadDialog";

/**
 * Which formatting is on offer.
 *
 * - `full` — the article body: headings included.
 * - `lead` — Motor.es' entradilla, whose own toolbar over there is bold, italic,
 *   list, link and quote. **No headings**, and that is not a simplification: a
 *   subtitle inside a 45-word opening paragraph would break their template,
 *   which prints the entradilla above the article as one block.
 */
export type EditorTools = "full" | "lead";

interface Props {
  /** Markdown, which stays the stored format whichever view is open. */
  value: string;
  onChange: (markdown: string) => void;
  tools?: EditorTools;
  /** Short box for a one-paragraph field, instead of the article-sized one. */
  compact?: boolean;
  /**
   * Names the editable area for a screen reader.
   *
   * A `<Label htmlFor>` cannot do it here: the editable region is a
   * contenteditable `div`, not a form control, so `for` never associates with it.
   */
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Write on the finished text, Google-Docs style (Fer, 2026-07-25). The default
 * view of the workspace.
 *
 * **Markdown is still the only thing stored.** This edits the rendered version
 * and converts back on every keystroke, which is normally a bad idea — except
 * that the element set here is small and closed (paragraphs, H2/H3, bold,
 * italic, code, links, lists, quotes). That is exactly what `markdownToHtml`
 * emits, what StarterKit produces and what `htmlToMarkdown` reads, so nothing
 * that can appear can be lost. Adding a feature to this editor means teaching
 * `html-to-markdown.ts` about it in the same commit, or it disappears silently
 * on the next edit.
 *
 * Images (2026-07-30, `tools: "full"` only, same gate as headings): Fer wants
 * them inline in the body, same as his own Motor.es pieces. Reuses the same
 * `ImageUploadDialog` (Cloudinary) `RichTextEditor` already uses for `posts` —
 * no separate upload path. Never on `lead`: the entradilla is a single CMS
 * paragraph field with nowhere to put a block image. `markdown.ts` and
 * `html-to-markdown.ts` were taught the `![alt](src)` ↔ `<img>` round trip in
 * the same commit, so this stays exactly as lossless as everything else here.
 *
 * `immediatelyRender: false` is required inside a hydrated Astro island, same as
 * in `RichTextEditor`.
 */
export default function VisualDraftEditor({
  value,
  onChange,
  tools = "full",
  compact,
  ariaLabel,
  disabled,
}: Props) {
  /**
   * Last Markdown this editor produced. Incoming `value` equal to it means the
   * change came from here, so the document must NOT be reset — doing that on
   * every keystroke is what makes the caret jump to the start.
   */
  const lastEmitted = useRef<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: {
            // Clicking a link inside the editor must place the caret, never
            // navigate: following it would throw you out of the admin panel in
            // the middle of an edit (Fer, 2026-07-25).
            openOnClick: false,
            // And whatever leaves here opens in a new tab, so the published
            // piece does not lose the reader either.
            HTMLAttributes: { target: "_blank", rel: "noreferrer noopener" },
          },
        }),
        // Only the article body gets images, never the entradilla (see the
        // doc comment above). `tools` is fixed for this instance's lifetime,
        // same assumption the "full"-only heading buttons already rely on.
        ...(tools === "full" ? [Image.configure({ HTMLAttributes: { loading: "lazy" } })] : []),
      ],
      content: markdownToHtml(value),
      immediatelyRender: false,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const markdown = htmlToMarkdown(editor.getHTML());
        lastEmitted.current = markdown;
        onChange(markdown);
      },
      editorProps: {
        attributes: {
          class: "tiptap focus:outline-none",
          ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        },
      },
    },
    [],
  );

  // Re-sync only when the text was changed somewhere else (the Markdown view, a
  // regeneration), never when it came from this editor: resetting the document
  // on every keystroke is what sends the caret back to the start.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    if (htmlToMarkdown(editor.getHTML()) === value) return;
    lastEmitted.current = value;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const insertImage = (src: string, alt: string) => {
    editor.chain().focus().setImage({ src, alt }).run();
  };

  const headingButtons = [
    {
      label: "Subtítulo",
      icon: <Heading2 />,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "Subtítulo menor",
      icon: <Heading3 />,
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
  ];

  const buttons = [
    {
      label: "Negrita",
      icon: <Bold />,
      run: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Cursiva",
      icon: <Italic />,
      run: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    ...(tools === "full" ? headingButtons : []),
    {
      label: "Lista",
      icon: <List />,
      run: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Lista numerada",
      icon: <ListOrdered />,
      run: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      label: "Cita",
      icon: <Quote />,
      run: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
    {
      label: "Enlace",
      icon: <Link2 />,
      run: () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("URL del enlace", previous ?? "https://");
        if (url === null) return;
        if (!url.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
      },
      active: editor.isActive("link"),
    },
    ...(tools === "full"
      ? [
          {
            label: "Imagen",
            icon: <ImagePlus />,
            run: () => setImageDialogOpen(true),
            active: false,
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
        {buttons.map(({ label, icon, run, active }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={run}
            disabled={disabled}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {icon}
          </Button>
        ))}

        <span className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          title="Deshacer"
          aria-label="Deshacer"
          className="text-muted-foreground hover:text-foreground"
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          title="Rehacer"
          aria-label="Rehacer"
          className="text-muted-foreground hover:text-foreground"
        >
          <Redo2 />
        </Button>
      </div>

      <div
        className={cn(
          "overflow-y-auto rounded-lg border border-input bg-background px-5 py-4",
          compact ? "max-h-[14rem] min-h-[7rem]" : "max-h-[36rem] min-h-[24rem]",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <EditorContent
          editor={editor}
          className="[&_.tiptap]:grid [&_.tiptap]:gap-4 [&_.tiptap]:text-base [&_.tiptap]:leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:max-w-full [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        />
      </div>

      {tools === "full" && (
        <ImageUploadDialog
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          onInsert={insertImage}
        />
      )}
    </div>
  );
}
