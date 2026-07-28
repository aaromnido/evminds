import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import Toast from "@/components/ui/toast";
import type { IdeaDraftInput } from "@/lib/editorial-types";
import { useToast } from "@/lib/use-toast";
import AiAssistButton from "./AiAssistButton";

const EMPTY: IdeaDraftInput = {
  proposed_title_es: "",
  angle: "",
  rationale: "",
  reference_urls: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persists the idea for real; returns whether it succeeded. */
  onCreate: (input: IdeaDraftInput) => Promise<boolean>;
}

/**
 * Side drawer to write your own idea (entry route B).
 *
 * Width, per Fer's spec: at most half the viewport from `sm` up, and never wider
 * than `100vw - 24px` below that, so it always reads as a drawer and never as a
 * full-screen takeover.
 *
 * The "Desarrollar con IA" button is the point of the screen: you type one rough
 * sentence and it comes back expanded with the nuances the sentence missed, so
 * you are never staring at empty fields. Backed by `editorial-expand-idea`, one
 * structured Gemini call with the style guide and editorial line as context.
 */
export default function CreateIdeaDrawer({ open, onOpenChange, onCreate }: Props) {
  const [draft, setDraft] = useState<IdeaDraftInput>(EMPTY);
  const [expanding, setExpanding] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  const canExpand = draft.proposed_title_es.trim().length > 0 || draft.angle.trim().length > 0;
  const canCreate = draft.proposed_title_es.trim().length > 0 && draft.angle.trim().length > 0;

  function set<K extends keyof IdeaDraftInput>(key: K, value: IdeaDraftInput[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function close() {
    onOpenChange(false);
    // Reset after the close animation so the fields don't flash empty.
    window.setTimeout(() => {
      setDraft(EMPTY);
      setExpanding(false);
    }, 200);
  }

  async function handleExpand() {
    setExpanding(true);
    try {
      const res = await fetch("/admin/redaccion/expand-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.proposed_title_es, angle: draft.angle }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      setDraft((prev) => ({ ...prev, angle: data.angle, rationale: data.rationale }));
    } catch {
      showToast("No se ha podido desarrollar la idea.", "error");
    } finally {
      setExpanding(false);
    }
  }

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    const ok = await onCreate(draft);
    setCreating(false);
    if (ok) {
      close();
    } else {
      showToast("No se ha podido crear la idea.", "error");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
        <SheetContent
          side="right"
          className="w-[calc(100vw-24px)]! gap-0 p-0 sm:max-w-[50vw]!"
          aria-label="Crear una idea"
        >
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-lg">Crear una idea</SheetTitle>
            <SheetDescription>
              Escribe la idea como te salga, aunque sea una frase. Luego la IA puede desarrollarla.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5">
              <div className="grid gap-1.5">
                <Label htmlFor="idea-title">Título de la idea</Label>
                <Input
                  id="idea-title"
                  value={draft.proposed_title_es}
                  onChange={(e) => set("proposed_title_es", e.target.value)}
                  placeholder="Ej.: Lo que nadie te cuenta de cargar en autopista en agosto"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="idea-angle">De qué va</Label>
                <Textarea
                  id="idea-angle"
                  value={draft.angle}
                  onChange={(e) => set("angle", e.target.value)}
                  rows={5}
                  placeholder="Una frase basta. Qué quieres contar y desde qué mirada."
                />
                <AiAssistButton
                  label="Desarrollar con IA"
                  runningLabel="Desarrollando…"
                  running={expanding}
                  disabled={!canExpand}
                  onClick={handleExpand}
                  hint="Amplía tu frase y le añade matices. Puedes editarlo todo después."
                  className="pt-1"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="idea-rationale">
                  Por qué ahora{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="idea-rationale"
                  value={draft.rationale}
                  onChange={(e) => set("rationale", e.target.value)}
                  rows={4}
                  placeholder="Qué lo hace oportuno hoy: una noticia, una fecha, una duda que se repite."
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="idea-refs">
                  Enlaces de documentación{" "}
                  <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="idea-refs"
                  value={draft.reference_urls}
                  onChange={(e) => set("reference_urls", e.target.value)}
                  rows={3}
                  placeholder={"Un enlace por línea.\nhttps://…"}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  La IA los leerá para documentar el artículo cuando lo redactes.
                </p>
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!canCreate || creating}>
              {creating ? "Creando…" : "Crear idea"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
