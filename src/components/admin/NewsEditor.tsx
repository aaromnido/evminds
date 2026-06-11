import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NewsFormValues {
  title?: string;
  excerpt?: string;
  category?: string;
  image_url?: string;
  archived?: boolean;
  // AI fields (Gemini): summary + discussion prompt are editable; warnings and
  // the generated-at timestamp are shown read-only.
  ai_summary?: string;
  ai_discussion_prompt?: string;
  ai_warnings?: string[];
  ai_generated_at?: string;
  // Read-only context (scraper-managed; shown for orientation, not editable).
  sourceName?: string;
  articleUrl?: string;
  publishedAt?: string;
  contentType?: string;
}

interface Props {
  id: string;
  article: NewsFormValues;
  error?: string;
  /** Distinct categories already in use, for the datalist suggestions. */
  categories?: string[];
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default function NewsEditor({ id, article, error, categories = [] }: Props) {
  const [imageUrl, setImageUrl] = useState(article.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const regenerate = async () => {
    setRegenMsg(null);
    setRegenerating(true);
    try {
      const res = await fetch(`/admin/noticias/${id}/regenerate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "La regeneración falló.");
      }
      // Reload so the (uncontrolled) summary/prompt fields — and any title/excerpt
      // translation — reflect what the function just wrote to the DB.
      window.location.reload();
    } catch (err) {
      setRegenMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Error al regenerar.",
      });
    } finally {
      setRegenerating(false);
    }
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
      id="news-editor-form"
      className="flex max-w-3xl flex-col gap-6"
    >
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Read-only context */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {article.sourceName && (
          <span>
            Medio: <span className="text-foreground">{article.sourceName}</span>
          </span>
        )}
        {article.contentType && <span>Tipo: {article.contentType}</span>}
        {article.publishedAt && (
          <span>Publicado: {article.publishedAt.slice(0, 10)}</span>
        )}
        {article.articleUrl && (
          <a
            href={article.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-foreground underline underline-offset-2"
          >
            Original <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={article.title ?? ""} required />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="excerpt">Extracto</Label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={article.excerpt ?? ""}
          required
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="category">Categoría</Label>
        <Input
          id="category"
          name="category"
          defaultValue={article.category ?? ""}
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

      {/* AI section (Gemini). Summary + discussion prompt are editable and saved
          with the form; warnings + generated-at are read-only. "Regenerar IA"
          calls the regenerate-ai Edge Function via the gated proxy. */}
      <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">IA (Gemini)</span>
          {article.ai_generated_at && (
            <span className="text-xs text-muted-foreground">
              Generado: {article.ai_generated_at.slice(0, 16).replace("T", " ")}
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={regenerating}
            onClick={regenerate}
            className="ml-auto"
          >
            {regenerating ? "Generando…" : "Regenerar IA"}
          </Button>
          {regenMsg && (
            <span
              role="status"
              className={cn(
                "w-full text-sm",
                regenMsg.ok ? "text-foreground" : "text-destructive",
              )}
            >
              {regenMsg.text}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ai_summary">Resumen IA</Label>
          <textarea
            id="ai_summary"
            name="ai_summary"
            defaultValue={article.ai_summary ?? ""}
            rows={6}
            placeholder="Sin resumen. Pulsa «Regenerar IA» o escríbelo a mano."
            className={fieldClass}
          />
          <p className="text-xs text-muted-foreground">
            Admite Markdown (negritas, etc.), igual que lo genera Gemini.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ai_discussion_prompt">Pregunta de debate</Label>
          <textarea
            id="ai_discussion_prompt"
            name="ai_discussion_prompt"
            defaultValue={article.ai_discussion_prompt ?? ""}
            rows={2}
            className={fieldClass}
          />
        </div>

        {article.ai_warnings && article.ai_warnings.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Avisos:</span>
            {article.ai_warnings.map((w) => (
              <span
                key={w}
                className="rounded border border-border bg-background px-2 py-0.5 text-xs"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" name="_action" value="save">
          Guardar cambios
        </Button>
        <a href="/admin/noticias" className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </a>
        {/* Soft-delete only (ADR-003): a hard delete would be re-scraped. Archiving
            is reversible, so no confirmation modal. */}
        <button
          type="submit"
          name="_action"
          value={article.archived ? "unarchive" : "archive"}
          formNoValidate
          className={cn(
            buttonVariants({
              variant: article.archived ? "outline" : "destructive",
            }),
            "ml-auto",
          )}
        >
          {article.archived ? "Desarchivar" : "Archivar"}
        </button>
      </div>
    </form>
  );
}
