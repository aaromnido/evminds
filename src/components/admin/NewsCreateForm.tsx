import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";

export interface SourceOption {
  id: string;
  name: string;
}

export interface NewsCreateValues {
  source_id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  category?: string;
  content_type?: string;
  article_url?: string;
  image_url?: string;
  published_at?: string;
  youtube_video_id?: string;
}

interface Props {
  sources: SourceOption[];
  categories?: string[];
  values?: NewsCreateValues;
  error?: string;
}

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

export default function NewsCreateForm({
  sources,
  categories = [],
  values,
  error,
}: Props) {
  const [title, setTitle] = useState(values?.title ?? "");
  const [slug, setSlug] = useState(values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(values?.slug));
  const [contentType, setContentType] = useState(values?.content_type ?? "news");
  const [imageUrl, setImageUrl] = useState(values?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "news");
      const res = await fetch("/admin/posts/upload-image", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(data.error || "No se pudo subir la imagen.");
      }
      setImageUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
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

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-1.5">
          <Label htmlFor="source_id">Medio (fuente)</Label>
          <select
            id="source_id"
            name="source_id"
            defaultValue={values?.source_id ?? ""}
            required
            className={fieldClass}
          >
            <option value="" disabled>
              Selecciona un medio…
            </option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="content_type">Tipo</Label>
          <select
            id="content_type"
            name="content_type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className={fieldClass}
          >
            <option value="news">Noticia</option>
            <option value="video">Vídeo</option>
          </select>
        </div>
      </div>

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
          URL pública: /{contentType === "video" ? "video" : "noticia"}/{slug || "…"}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="excerpt">Extracto</Label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={values?.excerpt ?? ""}
          required
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <div className="grid gap-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            name="category"
            defaultValue={values?.category ?? ""}
            list="news-categories"
            required
          />
          <datalist id="news-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="published_at">Fecha de publicación</Label>
          <Input
            id="published_at"
            name="published_at"
            type="datetime-local"
            defaultValue={values?.published_at ?? ""}
            required
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="article_url">URL original</Label>
        <Input
          id="article_url"
          name="article_url"
          type="url"
          defaultValue={values?.article_url ?? ""}
          placeholder="https://…"
          required
        />
        <p className="text-xs text-muted-foreground">
          Enlace a la fuente original. Debe ser único (el scraper lo usa para no duplicar).
        </p>
      </div>

      {contentType === "video" && (
        <div className="grid gap-1.5">
          <Label htmlFor="youtube_video_id">YouTube video ID</Label>
          <Input
            id="youtube_video_id"
            name="youtube_video_id"
            defaultValue={values?.youtube_video_id ?? ""}
            placeholder="dQw4w9WgXcQ"
          />
        </div>
      )}

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

      <div className="flex items-center gap-3">
        <Button type="submit">Crear noticia</Button>
        <a href="/admin/noticias" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </a>
      </div>
    </form>
  );
}
