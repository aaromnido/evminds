import { Lightbulb, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";
import { ideasUrl, newAngleUrl } from "@/lib/editorial-routes";
import type { IdeaCandidate, IdeaDraftInput } from "@/lib/editorial-types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import CardsSection from "./CardsSection";
import IdeaCard from "./IdeaCard";
import IdeaFormDrawer from "./IdeaFormDrawer";
import IdeasEmptyState from "./IdeasEmptyState";
import RegenerateIdeasDialog from "./RegenerateIdeasDialog";

/** How long "Deshacer" stays live before a dismissed idea is actually deleted. */
const DISMISS_UNDO_MS = 5000;

interface Props {
  nowIso: string;
}

/**
 * Step ① of the editorial wizard: the ideas you can work from today.
 *
 * **Only today's fresh proposals live here** (phase 7, 2026-07-28) — saving,
 * writing your own idea for good, editing, deleting and the history of what
 * was already written or let expire all moved to the Ideas section
 * (`/admin/redaccion/ideas`). "Redacción elige, Ideas gestiona."
 *
 * Persistence model (Fer, 2026-07-25, phase 5 2026-07-28) — the reason the
 * actions are what they are: a curator proposal is transient until you either
 * write about it or save it for later. Discarding it, or regenerating the
 * batch, drops it for good (real DELETE — see `dismiss-idea.ts`).
 *
 * "Propuestas de hoy" is fetched client-side from `curate-ideas.ts`, not
 * server-rendered: that call may hit Gemini (cache miss), and every other AI
 * wait in this wizard already happens after the page has painted rather than
 * blocking SSR.
 */
export default function PickIdeaStep({ nowIso }: Props) {
  const [proposals, setProposals] = useState<IdeaCandidate[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalsError, setProposalsError] = useState(false);

  // "Crear una idea" persists straight away (see `create-idea.ts`), but this
  // screen no longer keeps a "Guardadas y propias" section to show it in — so
  // instead of vanishing into the Ideas section unseen, it shows up here too,
  // for this visit only. The Ideas section is where it lives for good.
  const [justCreated, setJustCreated] = useState<IdeaCandidate[]>([]);

  const [pickingId, setPickingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const { toast, showToast, dismiss } = useToast();

  // Pending dismiss timeouts, keyed by idea id, so "Deshacer" can cancel the
  // real delete before it fires.
  const dismissTimers = useRef<Record<string, number>>({});
  useEffect(() => {
    const timers = dismissTimers.current;
    return () => {
      Object.values(timers).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  async function loadProposals(force: boolean) {
    if (force) setRegenerating(true);
    else setLoadingProposals(true);
    setProposalsError(false);

    try {
      const res = await fetch("/admin/redaccion/curate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      setProposals(data.candidates as IdeaCandidate[]);
    } catch {
      setProposalsError(true);
    } finally {
      setLoadingProposals(false);
      setRegenerating(false);
    }
  }

  useEffect(() => {
    loadProposals(false);
  }, []);

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

  /** Keep it for later: persisted immediately — it moves to the Ideas section. */
  function handleSave(idea: IdeaCandidate) {
    setSavingIds((prev) => ({ ...prev, [idea.id]: true }));
    fetch("/admin/redaccion/save-idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idea.id }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.ok !== true) throw new Error();
        setProposals((prev) => prev.filter((i) => i.id !== idea.id));
        showToast("Idea guardada. La verás en el banco de ideas.");
      })
      .catch(() => showToast("No se ha podido guardar la idea.", "error"))
      .finally(() => {
        setSavingIds(({ [idea.id]: _dropped, ...rest }) => rest);
      });
  }

  /**
   * Discarding removes it outright — an unsaved idea is never stored. The
   * card leaves the list right away; the real DELETE is deferred behind the
   * undo window so "Deshacer" never has to resurrect a row that is already
   * gone (see `DISMISS_UNDO_MS`).
   */
  function handleDismiss(idea: IdeaCandidate) {
    const before = proposals;
    setProposals(before.filter((i) => i.id !== idea.id));

    const timerId = window.setTimeout(() => {
      delete dismissTimers.current[idea.id];
      fetch("/admin/redaccion/dismiss-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idea.id }),
      }).catch(() => {
        // The card is already gone from view; a failed cleanup delete is not
        // worth surfacing after the fact.
      });
    }, DISMISS_UNDO_MS);
    dismissTimers.current[idea.id] = timerId;

    showToast("Idea descartada.", "info", {
      label: "Deshacer",
      onClick: () => {
        const pending = dismissTimers.current[idea.id];
        if (pending !== undefined) {
          window.clearTimeout(pending);
          delete dismissTimers.current[idea.id];
        }
        setProposals(before);
      },
    });
  }

  function handleRegenerate() {
    loadProposals(true);
  }

  async function handleCreate(input: IdeaDraftInput): Promise<boolean> {
    try {
      const res = await fetch("/admin/redaccion/create-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      setJustCreated((prev) => [data.idea as IdeaCandidate, ...prev]);
      showToast("Idea creada y guardada.");
      return true;
    } catch {
      return false;
    }
  }

  const nothingToShow = !loadingProposals && proposals.length + justCreated.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="lg" render={<a href={ideasUrl()} />}>
          <Lightbulb />
          Ver banco de ideas
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <RegenerateIdeasDialog
            pendingCount={proposals.length}
            running={regenerating}
            onConfirm={handleRegenerate}
          />
          {/* size="lg" to match the actions inside the cards below. */}
          <Button size="lg" onClick={() => setDrawerOpen(true)}>
            <Plus />
            Crear una idea
          </Button>
        </div>
      </div>

      {nothingToShow ? (
        <IdeasEmptyState onCreate={() => setDrawerOpen(true)} />
      ) : (
        <div className={cn("grid gap-8", (pickingId || regenerating) && "pointer-events-none")}>
          <CardsSection
            title="Propuestas de hoy"
            hint={
              proposalsError
                ? "No se han podido cargar. Inténtalo de nuevo."
                : "No se guardan: si no eliges ni guardas, desaparecen."
            }
            count={proposals.length}
          >
            {loadingProposals ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Buscando propuestas de hoy…
              </div>
            ) : proposalsError ? (
              <Button variant="outline" size="lg" onClick={() => loadProposals(false)}>
                Reintentar
              </Button>
            ) : (
              proposals.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  nowIso={nowIso}
                  picking={pickingId === idea.id}
                  saveState={savingIds[idea.id] ? "saving" : "idle"}
                  onPick={handlePick}
                  onSave={handleSave}
                  onDismiss={handleDismiss}
                />
              ))
            )}
          </CardsSection>

          {justCreated.length > 0 && (
            <CardsSection
              title="Acabas de crear"
              hint="Ya están guardadas. Siempre puedes verlas en el banco de ideas."
              count={justCreated.length}
            >
              {justCreated.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  nowIso={nowIso}
                  picking={pickingId === idea.id}
                  onPick={handlePick}
                />
              ))}
            </CardsSection>
          )}
        </div>
      )}

      <IdeaFormDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={handleCreate} />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
