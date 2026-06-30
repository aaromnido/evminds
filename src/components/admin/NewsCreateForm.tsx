import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import SaveButton from "./SaveButton";
import ImageDropZone from "./ImageDropZone";
import RichTextEditor from "./RichTextEditor";
import SlugField from "./SlugField";
import { slugify } from "@/lib/slugify";

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

export default function NewsCreateForm({ sources, categories = [], values, error }: Props) {
  const [title, setTitle] = useState(values?.title ?? "");
  const [slug, setSlug] = useState(values?.slug ?? "");
  const [excerpt, setExcerpt] = useState(values?.excerpt ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(values?.slug));
  const [contentType, setContentType] = useState(values?.content_type ?? "news");
  const [imageUrl, setImageUrl] = useState(values?.image_url ?? "");
  const [excerptError, setExcerptError] = useState("");

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const empty = !excerpt || excerpt === "<p></p>";
    if (empty) {
      setExcerptError("El extracto es obligatorio.");
      e.preventDefault();
    } else setExcerptError("");
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  return (
    <form
      method="POST"
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

      {/* Left column: title, image, main content fields, buttons */}
      <div className="flex flex-col gap-6">
        <div className="grid gap-1.5">
          <Label htmlFor="title">
            Título{" "}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </Label>
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
            prefix={`/${contentType === "video" ? "video" : "noticia"}/`}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Imagen</Label>
          <ImageDropZone value={imageUrl} onChange={setImageUrl} />
        </div>

        <div className="grid gap-1.5">
          <Label>
            Extracto{" "}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </Label>
          <RichTextEditor
            value={values?.excerpt ?? ""}
            onChange={(v) => {
              setExcerpt(v);
              if (excerptError && v && v !== "<p></p>") setExcerptError("");
            }}
          />
          <input type="hidden" name="excerpt" value={excerpt} readOnly />
          {excerptError && (
            <p role="alert" className="text-xs text-destructive">
              {excerptError}
            </p>
          )}
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

        <div className="flex items-center gap-3">
          <SaveButton loadingText="Creando…">Crear noticia</SaveButton>
          <a href="/admin/noticias" className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </a>
        </div>
      </div>

      {/* Right column: metadata fields */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
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

        <div className="grid gap-1.5">
          <Label htmlFor="category">Categoría</Label>
          <select
            id="category"
            name="category"
            defaultValue={values?.category ?? ""}
            required
            className={fieldClass}
          >
            <option value="" disabled>
              Selecciona una categoría…
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
    </form>
  );
}
