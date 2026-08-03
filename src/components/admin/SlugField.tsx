import { useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import CopyFieldButton from "@/components/admin/editorial/CopyFieldButton";

interface Props {
  slug: string;
  /** Called with the new slug value when the user edits it. */
  onChange: (slug: string) => void;
  /** Called when the user manually edits the slug (disables auto-sync with title). */
  onManualEdit: () => void;
  /** URL prefix shown in the hint, e.g. "/articulo/" or "/noticia/". */
  prefix: string;
  /**
   * Absent means there is nothing to copy elsewhere: EVminds' own slug is
   * used internally, never pasted anywhere. Motor.es' is (Fer, 2026-08-03) —
   * it goes into their own CMS's URL field, same as the rest of that screen.
   */
  copy?: {
    what: string;
    copied: boolean;
    onCopy: () => void;
    disabled?: boolean;
  };
}

export default function SlugField({ slug, onChange, onManualEdit, prefix, copy }: Props) {
  const [editing, setEditing] = useState(false);

  const copyButton = copy && (
    <CopyFieldButton
      what={copy.what}
      copied={copy.copied}
      onCopy={copy.onCopy}
      disabled={copy.disabled}
    />
  );

  return (
    <>
      <input type="hidden" name="slug" value={slug} />
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              onChange(e.target.value);
              onManualEdit();
            }}
            onBlur={() => setEditing(false)}
            autoFocus
            className="flex-1"
          />
          {copyButton}
        </div>
      ) : (
        <div className="group -mx-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
          <span className="flex-1">
            URL: {prefix}
            {slug || "…"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar slug"
            className="shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          {copyButton}
        </div>
      )}
    </>
  );
}
