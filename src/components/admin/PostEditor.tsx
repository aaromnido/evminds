import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import SaveButton from "./SaveButton";
import ImageDropZone from "./ImageDropZone";
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
import { X, Trash2, Loader2 } from "lucide-react";
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
  const [excerptError, setExcerptError] = useState("");
  const [contentError, setContentError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const emptyRTE = (html: string) => !html || html === "<p></p>";

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "delete") return;
    let valid = true;
    if (emptyRTE(excerpt)) { setExcerptError("El extracto es obligatorio."); valid = false; }
    else setExcerptError("");
    if (emptyRTE(content)) { setContentError("El contenido es obligatorio."); valid = false; }
    else setContentError("");
    if (!valid) e.preventDefault();
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    // Keep the slug in sync with the title until the user edits the slug by hand.
    if (!slugEdited) setSlug(slugify(v));
  };

  return (
    <form
      method="POST"
      id="post-editor-form"
      className="grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]"
      onSubmit={handleSubmit}
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
          <Label htmlFor="title">Título <span aria-hidden="true" className="text-destructive">*</span></Label>
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
          <Label>Imagen</Label>
          <ImageDropZone value={imageUrl} onChange={setImageUrl} folder="posts" />
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
          <Label>Extracto <span aria-hidden="true" className="text-destructive">*</span></Label>
          <RichTextEditor value={post?.excerpt ?? ""} onChange={(v) => { setExcerpt(v); if (excerptError && v && v !== "<p></p>") setExcerptError(""); }} minHeight="200px" />
          <input type="hidden" name="excerpt" value={excerpt} readOnly />
          {excerptError && <p role="alert" className="text-xs text-destructive">{excerptError}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label>Contenido <span aria-hidden="true" className="text-destructive">*</span></Label>
          <RichTextEditor value={post?.content ?? ""} onChange={(v) => { setContent(v); if (contentError && v && v !== "<p></p>") setContentError(""); }} minHeight="400px" />
          <input type="hidden" name="content" value={content} readOnly />
          {contentError && <p role="alert" className="text-xs text-destructive">{contentError}</p>}
        </div>

        <div className="flex items-center gap-3">
          <SaveButton name="_action" value="save">
            {submitLabel}
          </SaveButton>
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
                    <Trash2 className="h-4 w-4" />
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
                    onClick={() => setDeleting(true)}
                    className={cn(buttonVariants({ variant: "destructive" }), deleting && "pointer-events-none opacity-75")}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? "Eliminando…" : "Eliminar"}
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
            required
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
