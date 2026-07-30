import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";
import { newAngleUrl } from "@/lib/editorial-routes";
import type { IdeaCandidate, IdeaDraftInput } from "@/lib/editorial-types";
import { useToast } from "@/lib/use-toast";
import CardsSection from "./CardsSection";
import DeleteIdeaDialog from "./DeleteIdeaDialog";
import IdeaCard from "./IdeaCard";
import IdeaFormDrawer from "./IdeaFormDrawer";

/**
 * `window` event name the page's header button dispatches for "Crear una
 * idea" (see `ideas.astro`'s `actionEventName` and `AdminSidebarLayout`'s doc
 * comment on why a header action needs this instead of a plain callback).
 * Exported so both ends import the same string rather than each hardcoding it.
 */
export const IDEAS_CREATE_EVENT = "ideas:create";

interface Props {
  /** "Guardadas y propias": every idea with status `saved`. */
  kept: IdeaCandidate[];
  /** "Ya escritas o caducadas": `picked` + `expired`. */
  history: IdeaCandidate[];
  nowIso: string;
}

/**
 * Ideas — the bank of saved and own ideas, plus their history (task A3, phase
 * 7). "Redacción elige, Ideas gestiona": the wizard's step ① only ever shows
 * today's fresh proposals now; everything durable about an idea — saving,
 * writing one from scratch, editing it, deleting it, or looking back at what
 * was already written or let expire — lives here instead. This is the only
 * screen that can edit or delete an idea.
 *
 * Same shape as `PiecesList.tsx` on purpose: two grouped sections of cards plus
 * a delete confirmation, because it is the same kind of screen solving the
 * same kind of problem — including its primary action living in the page
 * header, not the body (see `IDEAS_CREATE_EVENT`).
 */
export default function IdeasList({ kept: initialKept, history: initialHistory, nowIso }: Props) {
  const [kept, setKept] = useState(initialKept);
  const [history, setHistory] = useState(initialHistory);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  // null while the drawer creates a new idea; the idea being edited otherwise.
  const [editing, setEditing] = useState<IdeaCandidate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IdeaCandidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  // The header (a separate hydrated island — see AdminSidebarLayout) can't
  // call this directly, so it dispatches IDEAS_CREATE_EVENT instead.
  useEffect(() => {
    window.addEventListener(IDEAS_CREATE_EVENT, openCreate);
    return () => window.removeEventListener(IDEAS_CREATE_EVENT, openCreate);
  }, []);

  function openEdit(idea: IdeaCandidate) {
    setEditing(idea);
    setFormOpen(true);
  }

  /** Same flow as the picker's "Escribir sobre esto": mark it picked, then go write. */
  function handlePick(idea: IdeaCandidate) {
    setPickingId(idea.id);
    fetch("/admin/redaccion/pick-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idea.id }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.ok !== true) throw new Error();
        window.location.href = newAngleUrl(idea.id);
      })
      .catch(() => {
        setPickingId(null);
        showToast("No se ha podido elegir esta idea. Inténtalo de nuevo.", "error");
      });
  }

  async function handleFormSubmit(input: IdeaDraftInput): Promise<boolean> {
    const endpoint = editing ? "/admin/redaccion/update-idea" : "/admin/redaccion/create-idea";
    const body = editing ? { id: editing.id, ...input } : input;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      const idea = data.idea as IdeaCandidate;
      if (editing) {
        setKept((prev) => prev.map((i) => (i.id === idea.id ? idea : i)));
        showToast("Cambios guardados.");
      } else {
        setKept((prev) => [idea, ...prev]);
        showToast("Idea creada.");
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/admin/redaccion/delete-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      if (!res.ok) throw new Error(`delete-idea responded ${res.status}`);
      setKept((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      setHistory((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      showToast("Idea borrada.", "info");
      setPendingDelete(null);
    } catch (err) {
      console.error("no se pudo borrar la idea:", err);
      // Never a dead end: the dialog stays open so retrying is one click.
      showToast("No se ha podido borrar. Inténtalo otra vez.", "error");
    } finally {
      setDeleting(false);
    }
  }

  const createButton = (
    <Button size="lg" onClick={openCreate}>
      <Plus />
      Crear una idea
    </Button>
  );

  const isEmpty = kept.length === 0 && history.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {isEmpty ? (
        <div className="grid gap-4 rounded-xl border border-dashed border-border p-8 text-center">
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold tracking-tight">
              Todavía no hay ninguna idea guardada
            </h2>
            <p className="text-sm text-muted-foreground">
              Guarda una propuesta desde "Escribir algo nuevo", o crea la tuya aquí mismo.
            </p>
          </div>
          <div className="flex justify-center">{createButton}</div>
        </div>
      ) : (
        <>
          <CardsSection
            title="Guardadas y propias"
            hint="Escribe sobre ellas cuando quieras, edítalas o bórralas si ya no sirven."
            count={kept.length}
          >
            {kept.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                nowIso={nowIso}
                picking={pickingId === idea.id}
                deleting={deleting && pendingDelete?.id === idea.id}
                onPick={handlePick}
                onEdit={openEdit}
                onDelete={setPendingDelete}
              />
            ))}
          </CardsSection>

          <CardsSection
            title="Ya escritas o caducadas"
            hint="Ya se convirtieron en una pieza, o caducaron antes de guardarse."
            count={history.length}
          >
            {history.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                nowIso={nowIso}
                variant="history"
                deleting={deleting && pendingDelete?.id === idea.id}
                onDelete={setPendingDelete}
              />
            ))}
          </CardsSection>
        </>
      )}

      <IdeaFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleFormSubmit}
      />
      <DeleteIdeaDialog
        title={pendingDelete?.proposed_title_es ?? null}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
