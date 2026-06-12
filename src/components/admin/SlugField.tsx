import { useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  slug: string;
  /** Called with the new slug value when the user edits it. */
  onChange: (slug: string) => void;
  /** Called when the user manually edits the slug (disables auto-sync with title). */
  onManualEdit: () => void;
  /** URL prefix shown in the hint, e.g. "/articulo/" or "/noticia/". */
  prefix: string;
}

export default function SlugField({ slug, onChange, onManualEdit, prefix }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <input type="hidden" name="slug" value={slug} />
      {editing ? (
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            onChange(e.target.value);
            onManualEdit();
          }}
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <div className="group -mx-2 flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
          <span>
            URL: {prefix}
            {slug || "…"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar slug"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
