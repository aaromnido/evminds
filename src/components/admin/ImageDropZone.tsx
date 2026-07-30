import { useRef, useState } from "react";
import { Download, ImagePlus, UploadCloud, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { downloadableImageUrl } from "@/lib/image-utils";
import BrandPressPicker from "./BrandPressPicker";
import ImageFilterStrip from "./ImageFilterStrip";
import { supportsImageFilters } from "@/lib/image-filters";

interface Props {
  value: string;
  onChange: (url: string) => void;
  name?: string;
  uploadEndpoint?: string;
  folder?: string;
  /**
   * CSS `filter` applied to the preview only. Used by the editorial wizard to
   * show the AI variation you picked on the big image, without touching the
   * stored URL. Left unset everywhere else.
   */
  previewFilter?: string;
}

export default function ImageDropZone({
  value,
  onChange,
  name = "image_url",
  uploadEndpoint = "/admin/articulos/upload-image",
  folder = "news",
  previewFilter,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      const res = await fetch(uploadEndpoint, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(data.error || "No se pudo subir la imagen.");
      }
      onChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadFile(file);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await uploadFile(file);
  };

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={value} readOnly />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onFileSelected}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-md border border-input">
          <img
            src={value}
            alt="Vista previa"
            className="aspect-video w-full object-cover transition-[filter] duration-200"
            style={previewFilter ? { filter: previewFilter } : undefined}
          />
          <div className="absolute right-2 top-2 flex gap-1">
            {/* Cloudinary has to be told to send the file as an attachment;
                a bare `download` attribute is ignored cross-origin. */}
            <a
              href={downloadableImageUrl(value)}
              download
              target="_blank"
              rel="noreferrer noopener"
              title="Descargar la imagen"
              className="flex items-center justify-center rounded-md bg-background/90 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only">Descargar la imagen</span>
            </a>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {uploading ? "Subiendo…" : "Cambiar"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Quitar imagen"
              className="flex items-center justify-center rounded-md bg-background/90 p-1.5 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-10 transition-colors select-none",
            isDragging
              ? "border-ring bg-accent/50"
              : "border-input hover:border-ring/50 hover:bg-muted/30",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <UploadCloud
            className={cn("h-8 w-8", isDragging ? "text-foreground" : "text-muted-foreground")}
          />
          <div className="text-center">
            <p className="text-sm font-medium">
              {uploading ? "Subiendo…" : isDragging ? "Suelta aquí" : "Arrastra una imagen aquí"}
            </p>
            {!uploading && !isDragging && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                o haz clic para seleccionar · PNG, JPG, WEBP, GIF
              </p>
            )}
          </div>
        </div>
      )}

      {/* Third way of getting a photo, and only while there is none: the brand's
          official press room (Phase 6A.1). It sits between "drag one in" and
          "paste a URL" because that is the order of the three answers to the same
          question. Once there IS an image the drop zone turns into preview mode
          and this goes away — replacing a photo means removing it first. */}
      {!value && <BrandPressPicker className="pt-0.5" />}

      {/* The mirror image of the picker above: the house grades, and only once
          there IS an image (Phase 6A.2). Guarded on the URL because the wizard
          still hands out a same-origin `MOCK_HERO_IMAGE` that Cloudinary can do
          nothing with — a strip of eight identical thumbnails would be worse
          than no strip at all. */}
      {value && supportsImageFilters(value) && (
        <ImageFilterStrip value={value} onChange={onChange} className="pt-0.5" />
      )}

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="o pega una URL de imagen…"
        className="text-xs"
      />

      {uploadError && (
        <p role="alert" className="text-xs text-destructive">
          {uploadError}
        </p>
      )}
    </div>
  );
}
