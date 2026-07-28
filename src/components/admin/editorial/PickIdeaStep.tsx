import { ArrowLeft, ChevronDown, History, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";
import { newAngleUrl } from "@/lib/editorial-routes";
import type { IdeaCandidate, IdeaDraftInput } from "@/lib/editorial-types";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import CardsSection from "./CardsSection";
import CreateIdeaDrawer from "./CreateIdeaDrawer";
import IdeaCard from "./IdeaCard";
import IdeasEmptyState from "./IdeasEmptyState";
import RegenerateIdeasDialog from "./RegenerateIdeasDialog";

/** How long "Deshacer" stays live before a dismissed idea is actually deleted. */
const DISMISS_UNDO_MS = 5000;

/**
 * How many stored ideas show before collapsing the rest.
 *
 * Stored ideas go FIRST because they are the user's own committed intentions,
 * while proposals are just machine suggestions — burying what you chose under
 * what you were offered is how "save for later" piles die. But they are also
 * unbounded, and today's proposals expire in 48 h, so an ever-growing bank on top
 * would push the perishable half below the fold. The cap is what keeps both
 * visible.
 */
const KEPT_PREVIEW = 3;

interface Props {
  /** "Guardadas y propias" — everything with status `saved`, from step ①'s SSR query. */
  kept: IdeaCandidate[];
  /** "Ya escritas o caducadas" — `picked` + `expired`, capped, same SSR query. */
  history: IdeaCandidate[];
  nowIso: string;
}

/**
 * Step ① of the editorial wizard: the ideas you can work from today.
 *
 * Persistence model (Fer, 2026-07-25, phase 5 2026-07-28) — the reason the
 * actions are what they are: a curator proposal is transient until you either
 * write about it or save it for later. Discarding it, or regenerating the
 * batch, drops it for good (real DELETE — see `dismiss-idea.ts`). Ideas
 * written by hand are persisted from birth.
 *
 * "Propuestas de hoy" is fetched client-side from `curate-ideas.ts`, not
 * server-rendered: that call may hit Gemini (cache miss), and every other AI
 * wait in this wizard already happens after the page has painted rather than
 * blocking SSR.
 */
export default function PickIdeaStep({
  kept: initialKept,
  history: initialHistory,
  nowIso,
}: Props) {
  const [kept, setKept] = useState<IdeaCandidate[]>(initialKept);
  const [history, setHistory] = useState<IdeaCandidate[]>(initialHistory);
  const [proposals, setProposals] = useState<IdeaCandidate[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalsError, setProposalsError] = useState(false);

  const [view, setView] = useState<"pending" | "history">("pending");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const { toast, showToast, dismiss } = useToast();

  const [showAllKept, setShowAllKept] = useState(false);

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

      if (force) {
        // The replaced batch becomes history immediately, so "Ver historial"
        // is honest without a full page reload.
        setHistory((prev) => [
          ...proposals.map((p) => ({ ...p, status: "expired" as const })),
          ...prev,
        ]);
      }
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

  /** Keep it for later: persisted immediately, so the card moves section on success. */
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
        setKept((prev) => [{ ...idea, status: "saved" as const }, ...prev]);
        showToast("Idea guardada para otra ocasión.");
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
      setKept((prev) => [data.idea as IdeaCandidate, ...prev]);
      setView("pending");
      showToast("Idea creada y guardada.");
      return true;
    } catch {
      return false;
    }
  }

  const visibleKept = showAllKept ? kept : kept.slice(0, KEPT_PREVIEW);
  const hiddenKeptCount = kept.length - visibleKept.length;

  const nothingToShow =
    view === "pending"
      ? !loadingProposals && proposals.length + kept.length === 0
      : history.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Same shape as the two actions on the right: outline + icon + size lg. */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => setView(view === "pending" ? "history" : "pending")}
        >
          {view === "pending" ? (
            <>
              <History />
              Ver historial
            </>
          ) : (
            <>
              <ArrowLeft />
              Volver a mis ideas
            </>
          )}
        </Button>

        {view === "pending" && (
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
        )}
      </div>

      {nothingToShow ? (
        <IdeasEmptyState view={view} onCreate={() => setDrawerOpen(true)} />
      ) : (
        <div className={cn("grid gap-8", (pickingId || regenerating) && "pointer-events-none")}>
          {view === "pending" ? (
            <>
              <CardsSection
                title="Guardadas y propias"
                hint="Tus ideas. Siguen aquí hasta que escribas sobre ellas."
                count={kept.length}
              >
                {/* No onDismiss on purpose: a stored idea is deleted from the
                    Ideas section, not discarded from the picker. */}
                {visibleKept.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    nowIso={nowIso}
                    picking={pickingId === idea.id}
                    onPick={handlePick}
                  />
                ))}
                {hiddenKeptCount > 0 && (
                  <div>
                    <Button variant="outline" size="lg" onClick={() => setShowAllKept(true)}>
                      <ChevronDown />
                      Ver {hiddenKeptCount} idea{hiddenKeptCount === 1 ? "" : "s"} más
                    </Button>
                  </div>
                )}
              </CardsSection>

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
            </>
          ) : (
            <CardsSection title="Ya escritas o caducadas" count={history.length}>
              {history.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} nowIso={nowIso} variant="history" />
              ))}
            </CardsSection>
          )}
        </div>
      )}

      <CreateIdeaDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onCreate={handleCreate} />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
