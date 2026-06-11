import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RichTextEditor from "./RichTextEditor";

const CATEGORIES = ["Experiencia", "Guía", "Review", "Opinión", "Viaje"];

export interface PostFormValues {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  tags?: string; // comma-separated
  image_url?: string;
  image_alt?: string;
  status?: string; // draft | published
  published_at?: string; // datetime-local value
}

interface Props {
  /** Pre-filled values (edit mode, or repopulating after a failed submit). */
  post?: PostFormValues;
  error?: string;
  submitLabel?: string;
  /** Show the destructive delete button (edit mode only). */
  showDelete?: boolean;
}

// Native field styling that matches the shadcn Input look (for <select>/<textarea>).
const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PostEditor({
  post,
  error,
  submitLabel = "Guardar",
  showDelete = false,
}: Props) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(post?.slug));
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");

  const onTitleChange = (v: string) => {
    setTitle(v);
    // Keep the slug in sync with the title until the user edits the slug by hand.
    if (!slugEdited) setSlug(slugify(v));
  };

  return (
    <form method="POST" className="flex max-w-3xl flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          required
        />
        <p className="text-xs text-muted-foreground">
          URL pública: /articulo/{slug || "…"}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="excerpt">Extracto</Label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          required
          rows={2}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Contenido</Label>
        <RichTextEditor value={post?.content ?? ""} onChange={setContent} />
        <input type="hidden" name="content" value={content} readOnly />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Categoría</Label>
          <select
            id="category"
            name="category"
            defaultValue={post?.category ?? CATEGORIES[0]}
            className={fieldClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={post?.tags ?? ""}
            placeholder="Tesla, batería, …"
          />
          <p className="text-xs text-muted-foreground">Separados por comas.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="image_url">Imagen (URL)</Label>
          <Input
            id="image_url"
            name="image_url"
            defaultValue={post?.image_url ?? ""}
            placeholder="https://…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="image_alt">Texto alternativo</Label>
          <Input
            id="image_alt"
            name="image_alt"
            defaultValue={post?.image_alt ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={fieldClass}
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="published_at">Fecha de publicación</Label>
          <Input
            id="published_at"
            name="published_at"
            type="datetime-local"
            defaultValue={post?.published_at ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Futura = programado · vacío + publicado = ahora.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" name="_action" value="save">
          {submitLabel}
        </Button>
        <a href="/admin/posts" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </a>
        {showDelete && (
          <button
            type="submit"
            name="_action"
            value="delete"
            formNoValidate
            onClick={(e) => {
              if (
                !window.confirm(
                  "¿Eliminar este artículo? Esta acción no se puede deshacer.",
                )
              ) {
                e.preventDefault();
              }
            }}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "ml-auto",
            )}
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
