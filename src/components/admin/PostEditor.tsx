import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import RichTextEditor from "./RichTextEditor";
import SlugField from "./SlugField";

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
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? "");
  const [tags, setTags] = useState<string[]>(
    post?.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  );
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onTitleChange = (v: string) => {
    setTitle(v);
    // Keep the slug in sync with the title until the user edits the slug by hand.
    if (!slugEdited) setSlug(slugify(v));
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/admin/posts/upload-image", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(data.error || "No se pudo subir la imagen.");
      }
      setImageUrl(data.url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No se pudo subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      method="POST"
      id="post-editor-form"
      className="grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]"
    >
      {error && (
        <p
          role="alert"
          className="col-span-full rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Left column: title, slug, image, alt, excerpt, content, buttons */}
      <div className="flex flex-col gap-6">
        <div className="grid gap-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
          />
          <SlugField
            slug={slug}
            onChange={setSlug}
            onManualEdit={() => setSlugEdited(true)}
            prefix="/articulo/"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="image_url">Imagen</Label>
          <div className="flex gap-2">
            <Input
              id="image_url"
              name="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… o sube un archivo"
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Subiendo…" : "Subir"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={onFileSelected}
            />
          </div>
          {uploadError && (
            <p role="alert" className="text-xs text-destructive">
              {uploadError}
            </p>
          )}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Vista previa"
              className="mt-1 aspect-video w-full rounded-md border border-input object-cover"
            />
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="image_alt">Texto alternativo</Label>
          <Input
            id="image_alt"
            name="image_alt"
            defaultValue={post?.image_alt ?? ""}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Extracto</Label>
          <RichTextEditor value={post?.excerpt ?? ""} onChange={setExcerpt} minHeight="200px" />
          <input type="hidden" name="excerpt" value={excerpt} readOnly />
        </div>

        <div className="grid gap-1.5">
          <Label>Contenido</Label>
          <RichTextEditor value={post?.content ?? ""} onChange={setContent} minHeight="400px" />
          <input type="hidden" name="content" value={content} readOnly />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" name="_action" value="save">
            {submitLabel}
          </Button>
          <a href="/admin/posts" className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </a>
          {showDelete && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "destructive" }),
                      "ml-auto",
                    )}
                  >
                    Eliminar
                  </button>
                }
              />
              <AlertDialogContent className="gap-6 p-8">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">
                    ¿Eliminar este artículo?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex justify-end gap-3">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  {/* Submits the post form (associated by `form` id) from inside the
                      portal, with _action=delete. formNoValidate skips field checks. */}
                  <button
                    type="submit"
                    form="post-editor-form"
                    name="_action"
                    value="delete"
                    formNoValidate
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    Eliminar
                  </button>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Right column: metadata fields */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
        <div className="grid gap-1.5">
          <Label>Estado</Label>
          <div className="inline-flex w-fit overflow-hidden rounded-md border border-input text-sm">
            <button
              type="button"
              onClick={() => setStatus("draft")}
              className={cn(
                "px-3 py-1.5 transition-colors",
                status === "draft"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Borrador
            </button>
            <button
              type="button"
              onClick={() => setStatus("published")}
              className={cn(
                "border-l border-input px-3 py-1.5 transition-colors",
                status === "published"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Publicado
            </button>
          </div>
          <input type="hidden" name="status" value={status} />
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
          <Label htmlFor="tag-input">Tags</Label>
          {/* Hidden input carries the comma-separated value on submit — no API change needed. */}
          <input type="hidden" name="tags" value={tags.join(",")} />
          <div
            className={cn(
              fieldClass,
              "flex min-h-9 flex-wrap gap-1.5 py-1.5",
              tags.length > 0 && "pb-1.5",
            )}
            onClick={() => document.getElementById("tag-input")?.focus()}
          >
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="h-6 gap-1 px-2 py-0.5 text-xs">
                {tag}
                <button
                  type="button"
                  aria-label={`Eliminar tag ${tag}`}
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const val = tagInput.trim().replace(/,$/, "");
                  if (val && !tags.includes(val)) {
                    setTags((prev) => [...prev, val]);
                  }
                  setTagInput("");
                } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
              placeholder={tags.length === 0 ? "Tesla, batería, …" : ""}
              className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground">Pulsa Enter o coma para añadir.</p>
        </div>
      </div>
    </form>
  );
}
