import { useState } from "react";
import { Bot, ExternalLink, Eye, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import RichTextEditor from "./RichTextEditor";
import ImageDropZone from "./ImageDropZone";
import SaveButton from "./SaveButton";
import ArchiveButton from "./ArchiveButton";
import ToneSelect from "./ToneSelect";
import { type HeadlineTone } from "@/lib/headline-tone";

export interface NewsFormValues {
  title?: string;
  excerpt?: string;
  category?: string;
  image_url?: string;
  archived?: boolean;
  // SEO title (Gemini or hand-edited): feeds <title>/og:title/<h1>, falls back
  // to `title` when empty. Has its own independent "Generar con IA" button.
  seo_title?: string;
  // Headline tone (A12 "Medios de Confianza"): manual override of the AI
  // traffic-light classification. Empty <select> value ("Sin clasificar") → null.
  headline_tone?: HeadlineTone | null;
  // AI fields (Gemini): summary + discussion prompt are editable; warnings and
  // the generated-at timestamp are shown read-only.
  ai_summary?: string;
  ai_discussion_prompt?: string;
  ai_warnings?: string[];
  ai_generated_at?: string;
  // Read-only context (scraper-managed; shown for orientation, not editable).
  sourceName?: string;
  slug?: string;
  articleUrl?: string;
  publishedAt?: string;
  contentType?: string;
  hasComments?: boolean;
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
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [aiSummary, setAiSummary] = useState(article.ai_summary ?? "");
  const [imageUrl, setImageUrl] = useState(article.image_url ?? "");
  const [seoTitle, setSeoTitle] = useState(article.seo_title ?? "");

  const [excerptError, setExcerptError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [seoMsg, setSeoMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // Independent "Generar con IA" for the SEO title: regenerates ONLY seo_title
  // (only: 'seo_title') and fills the input, without touching the other fields.
  const generateSeoTitle = async () => {
    setSeoMsg(null);
    setSeoGenerating(true);
    try {
      const res = await fetch(`/admin/noticias/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ only: "seo_title" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.seo_title) {
        throw new Error(data.error || "No se pudo generar el título SEO.");
      }
      setSeoTitle(data.seo_title);
      setSeoMsg({ ok: true, text: "Título SEO generado. Revisa y guarda." });
    } catch (err) {
      setSeoMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Error al generar.",
      });
    } finally {
      setSeoGenerating(false);
    }
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "archive" || submitter?.value === "unarchive") return;
    const empty = !excerpt || excerpt === "<p></p>";
    if (empty) { setExcerptError("El extracto es obligatorio."); e.preventDefault(); }
    else setExcerptError("");
  };
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

  return (
    <form
      method="POST"
      id="news-editor-form"
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

      {/* Title + SEO title — mobile: 1st; desktop: left col row 1 */}
      <div className="flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="title">Título <span aria-hidden="true" className="text-destructive">*</span></Label>
          <Input id="title" name="title" defaultValue={article.title ?? ""} required />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="seo_title">Título SEO</Label>
            <span
              className={cn(
                "text-xs tabular-nums",
                seoTitle.length > 80 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {seoTitle.length}/80
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="seo_title"
              name="seo_title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={90}
              placeholder="Marca + modelo + ángulo (vacío → usa el título)"
              className="flex-1"
            />
            <IconButton
              type="button"
              variant="outline"
              icon={Sparkles}
              disabled={seoGenerating}
              onClick={generateSeoTitle}
            >
              {seoGenerating ? "Generando…" : "Generar con IA"}
            </IconButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Alimenta el {"<title>"}, og:title y el H1. Si se deja vacío, se usa el
            título. Máx. 75 caracteres, con lo esencial en los primeros 60 (lo
            que Google muestra en sus resultados).
          </p>
          {seoMsg && (
            <span
              role="status"
              className={cn(
                "text-sm",
                seoMsg.ok ? "text-foreground" : "text-destructive",
              )}
            >
              {seoMsg.text}
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Tono del titular</Label>
          <ToneSelect name="headline_tone" defaultValue={article.headline_tone ?? ""} />
          <p className="text-xs text-muted-foreground">
            Semáforo de honestidad del titular ("Medios de Confianza"). La IA lo
            asigna al scrapear; corrígelo aquí si hace falta.
          </p>
        </div>
      </div>

      {/* Right sidebar — mobile: 2nd (between title and image); desktop: right col spanning both rows */}
      <div className="flex flex-col gap-6 lg:row-span-2 lg:sticky lg:top-8 lg:self-start">
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          {article.sourceName && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Medio</span>
              <span className="font-medium">{article.sourceName}</span>
            </div>
          )}
          {article.contentType && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium">{article.contentType}</span>
            </div>
          )}
          {article.publishedAt && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium">{article.publishedAt.slice(0, 10)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Comentarios</span>
            <span className={article.hasComments ? "font-medium" : "text-muted-foreground italic"}>
              {article.hasComments ? "Con comentarios" : "Sin comentarios"}
            </span>
          </div>
          {(article.articleUrl || article.slug) && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {article.articleUrl && (
                <IconButton
                  href={article.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  icon={ExternalLink}
                  className="w-full"
                >
                  Link a la fuente
                </IconButton>
              )}
              {article.slug && (
                <IconButton
                  href={`/noticia/${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  icon={Eye}
                  className="w-full"
                >
                  Ver artículo
                </IconButton>
              )}
            </div>
          )}
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

        {/* Convenience "save" mirroring the one at the bottom: lets you save from the
            sticky sidebar without scrolling down after editing the title. */}
        <SaveButton name="_action" value="save" className="w-full">
          Guardar cambios
        </SaveButton>
      </div>

      {/* Left col rest — mobile: 3rd; desktop: left col row 2 */}
      <div className="flex flex-col gap-6 min-w-0">
        <div className="grid gap-1.5">
          <Label>Imagen</Label>
          <ImageDropZone value={imageUrl} onChange={setImageUrl} />
        </div>

        <div className="grid gap-1.5">
          <Label>Extracto <span aria-hidden="true" className="text-destructive">*</span></Label>
          <RichTextEditor value={article.excerpt ?? ""} onChange={(v) => { setExcerpt(v); if (excerptError && v && v !== "<p></p>") setExcerptError(""); }} />
          <input type="hidden" name="excerpt" value={excerpt} readOnly />
          {excerptError && <p role="alert" className="text-xs text-destructive">{excerptError}</p>}
        </div>

        {/* IA (Gemini) block */}
        <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">IA (Gemini)</span>
            {article.ai_generated_at && (
              <span className="text-xs text-muted-foreground">
                Generado: {article.ai_generated_at.slice(0, 16).replace("T", " ")}
              </span>
            )}
            <IconButton
              type="button"
              variant="outline"
              icon={Bot}
              disabled={regenerating}
              onClick={regenerate}
              className="ml-auto"
            >
              {regenerating ? "Generando…" : "Regenerar IA"}
            </IconButton>
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
            <Label>Resumen IA</Label>
            <RichTextEditor value={article.ai_summary ?? ""} onChange={setAiSummary} />
            <input type="hidden" name="ai_summary" value={aiSummary} readOnly />
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
          <SaveButton name="_action" value="save">
            Guardar cambios
          </SaveButton>
          <a href="/admin/noticias" className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </a>
          {/* Soft-delete only (ADR-003): a hard delete would be re-scraped. */}
          <ArchiveButton archived={article.archived ?? false} />
        </div>
      </div>
    </form>
  );
}
