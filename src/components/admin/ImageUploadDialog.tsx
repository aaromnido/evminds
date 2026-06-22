import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ImageDropZone from "./ImageDropZone";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (url: string, alt: string) => void;
}

/**
 * Modal to add a body image to the editor: drag/drop or pick a file (uploaded to
 * Cloudinary by ImageDropZone, folder "posts") plus an alt-text field, then insert
 * it at the cursor. Replaces the native file picker + window.prompt flow with the
 * same UI as the hero-image field.
 */
export default function ImageUploadDialog({ open, onOpenChange, onInsert }: Props) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  const close = () => {
    onOpenChange(false);
    // Reset after the close animation so the fields don't flash empty.
    setTimeout(() => {
      setUrl("");
      setAlt("");
    }, 150);
  };

  const handleInsert = () => {
    if (!url) return;
    onInsert(url, alt);
    close();
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <AlertDialogContent className="max-w-lg! gap-6 p-6">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle className="text-lg">Insertar imagen</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Imagen</Label>
            <ImageDropZone
              value={url}
              onChange={setUrl}
              folder="posts"
              name="body-image-url"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="body-image-alt">Texto alternativo</Label>
            <Input
              id="body-image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe la imagen (SEO y accesibilidad)"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleInsert} disabled={!url}>
            Insertar imagen
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
