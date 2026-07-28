import { useEffect, useState } from "react";
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
import type { IdeaCandidate, IdeaDraftInput } from "@/lib/editorial-types";
import { useToast } from "@/lib/use-toast";
import AiAssistButton from "./AiAssistButton";

const EMPTY: IdeaDraftInput = {
  proposed_title_es: "",
  angle: "",
  rationale: "",
  reference_urls: "",
};

function toDraftInput(idea: IdeaCandidate): IdeaDraftInput {
  return {
    proposed_title_es: idea.proposed_title_es,
    angle: idea.angle,
    rationale: idea.rationale,
    reference_urls: idea.reference_urls.join("\n"),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for editing an existing (always `saved`) idea; omit to create one. */
  initial?: IdeaCandidate | null;
  /** Persists the change for real (create or update); returns whether it succeeded. */
  onSubmit: (input: IdeaDraftInput) => Promise<boolean>;
}

/**
 * Side drawer to write your own idea (entry route B), generalized (Ideas
 * section, phase 7) to also edit an existing saved one — same fields either
 * way, since the only thing that ever changes on an idea is its text.
 * `CreateIdeaDrawer` was its name before this; renamed rather than forked,
 * same reasoning as `IdeasSection` → `CardsSection`.
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
export default function IdeaFormDrawer({ open, onOpenChange, initial = null, onSubmit }: Props) {
  const mode = initial ? "edit" : "create";
  const [draft, setDraft] = useState<IdeaDraftInput>(initial ? toDraftInput(initial) : EMPTY);
  const [expanding, setExpanding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  // Re-seed every time it opens, for whichever idea (or blank) it opens with —
  // the drawer stays mounted between one edit and the next "crear"/"editar".
  useEffect(() => {
    if (open) {
      setDraft(initial ? toDraftInput(initial) : EMPTY);
      setExpanding(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const canExpand = draft.proposed_title_es.trim().length > 0 || draft.angle.trim().length > 0;
  const canSubmit = draft.proposed_title_es.trim().length > 0 && draft.angle.trim().length > 0;

  function set<K extends keyof IdeaDraftInput>(key: K, value: IdeaDraftInput[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
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

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit(draft);
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
    } else {
      showToast(
        mode === "create"
          ? "No se ha podido crear la idea."
          : "No se han podido guardar los cambios.",
        "error",
      );
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[calc(100vw-24px)]! gap-0 p-0 sm:max-w-[50vw]!"
          aria-label={mode === "create" ? "Crear una idea" : "Editar idea"}
        >
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="text-lg">
              {mode === "create" ? "Crear una idea" : "Editar idea"}
            </SheetTitle>
            <SheetDescription>
              {mode === "create"
                ? "Escribe la idea como te salga, aunque sea una frase. Luego la IA puede desarrollarla."
                : "Cambia lo que haga falta. Si viene de una noticia, esa fuente no se toca."}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting
                ? mode === "create"
                  ? "Creando…"
                  : "Guardando…"
                : mode === "create"
                  ? "Crear idea"
                  : "Guardar cambios"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
