import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useState } from "react";
import ImageUploadDialog from "./ImageUploadDialog";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  maxHeight?: string;
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 [&_svg]:size-4",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Minimal TipTap (v3) rich-text editor for the post body. StarterKit already
 * bundles Link/Underline/lists in v3. immediatelyRender:false is required so it
 * doesn't render on the server (this lives inside a hydrated Astro island).
 */
export default function RichTextEditor({
  value,
  onChange,
  minHeight = "280px",
  maxHeight = "500px",
}: Props) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Image.configure({ HTMLAttributes: { loading: "lazy" } })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const insertImage = (src: string, alt: string) => {
    editor.chain().focus().setImage({ src, alt }).run();
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", prev ?? "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div
      className="flex flex-col resize-y overflow-hidden rounded-md border border-input bg-background"
      style={{ minHeight, maxHeight }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1">
        <ToolbarButton
          label="Negrita"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Título H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          label="Título H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          label="Cita"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          <Quote />
        </ToolbarButton>
        <ToolbarButton label="Enlace" onClick={setLink} active={editor.isActive("link")}>
          <Link2 />
        </ToolbarButton>
        <ToolbarButton label="Imagen" onClick={() => setImageDialogOpen(true)}>
          <ImagePlus />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          label="Deshacer"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Rehacer"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 />
        </ToolbarButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>

      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onInsert={insertImage}
      />
    </div>
  );
}
