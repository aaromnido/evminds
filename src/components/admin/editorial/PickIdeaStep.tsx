import { useState } from "react";
import { ArrowLeft, ChevronDown, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import IdeaCard from "./IdeaCard";
import IdeasEmptyState from "./IdeasEmptyState";
import CardsSection from "./CardsSection";
import CreateIdeaDrawer from "./CreateIdeaDrawer";
import RegenerateIdeasDialog from "./RegenerateIdeasDialog";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import { buildMockIdeas, buildOwnIdea } from "@/lib/editorial-mocks";
import type { IdeaCandidate, IdeaDraftInput } from "@/lib/editorial-types";
import type { SaveState } from "./SaveIdeaButton";

/** Fake latencies (prototype only). */
const PICK_DELAY_MS = 700;
const REGENERATE_DELAY_MS = 1400;
const SAVE_DELAY_MS = 600;

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
  ideas: IdeaCandidate[];
  nowIso: string;
}

/**
 * Step ① of the editorial wizard: the ideas you can work from today.
 *
 * Persistence model (Fer, 2026-07-25) — the reason the actions are what they are:
 * a curator proposal is **transient** until you either write about it or save it
 * for later. Discarding it, or regenerating the batch, drops it for good; nothing
 * of that reaches the database. Ideas written by hand are persisted from birth.
 * The two sections make that split visible.
 *
 * PROTOTYPE: every action is simulated in local state — no backend.
 */
export default function PickIdeaStep({ ideas: initialIdeas, nowIso }: Props) {
  const [ideas, setIdeas] = useState<IdeaCandidate[]>(initialIdeas);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batch, setBatch] = useState<1 | 2>(1);
  const [ownCount, setOwnCount] = useState(0);
  /**
   * Save progress per idea of the current batch. Held apart from `status` on
   * purpose: saving must NOT make the card jump to another section under the
   * cursor. The regrouping happens when the batch is replaced.
   */
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const { toast, showToast, dismiss } = useToast();

  const [showAllKept, setShowAllKept] = useState(false);

  const proposals = ideas.filter((i) => i.status === "pending");
  const kept = ideas.filter((i) => i.status === "saved");
  const history = ideas.filter((i) => i.status === "picked" || i.status === "expired");

  const visibleKept = showAllKept ? kept : kept.slice(0, KEPT_PREVIEW);
  const hiddenKeptCount = kept.length - visibleKept.length;

  function handlePick(idea: IdeaCandidate) {
    setPickingId(idea.id);
    // Simulated hand-off. The real version persists the idea server-side and
    // lands on step ② with it already loaded.
    window.setTimeout(() => {
      window.location.href = `/admin/redaccion/enfoque?idea=${idea.id}`;
    }, PICK_DELAY_MS);
  }

  /** Keep it for later. One-way: the button ends up spent, not toggleable. */
  function handleSave(idea: IdeaCandidate) {
    setSaveStates((prev) => ({ ...prev, [idea.id]: "saving" }));
    window.setTimeout(() => {
      setSaveStates((prev) => ({ ...prev, [idea.id]: "saved" }));
      showToast("Idea guardada para otra ocasión.");
    }, SAVE_DELAY_MS);
  }

  /**
   * Discarding removes it outright — an unsaved idea is never stored. Because
   * that is irreversible, the toast carries the only way back: an undo that
   * restores the list exactly as it was, position included.
   */
  function handleDismiss(idea: IdeaCandidate) {
    // Snapshot before mutating: restoring the whole array brings the card back in
    // its original position, not appended at the end.
    const before = ideas;
    setIdeas(before.filter((i) => i.id !== idea.id));
    setSaveStates(({ [idea.id]: _dropped, ...rest }) => rest);
    showToast("Idea descartada.", "info", {
      label: "Deshacer",
      onClick: () => setIdeas(before),
    });
  }

  function handleRegenerate() {
    setRegenerating(true);
    const nextBatch: 1 | 2 = batch === 1 ? 2 : 1;
    window.setTimeout(() => {
      const fresh = buildMockIdeas(nowIso, nextBatch).filter((i) => i.status === "pending");
      setIdeas((prev) => [
        ...fresh,
        // Saved proposals graduate to stored ideas; the rest of the batch is
        // dropped for good. Already-stored ideas pass through untouched.
        ...prev
          .filter((i) => i.status !== "pending" || saveStates[i.id] === "saved")
          .map((i) => (i.status === "pending" ? { ...i, status: "saved" as const } : i)),
      ]);
      setSaveStates({});
      setBatch(nextBatch);
      setRegenerating(false);
    }, REGENERATE_DELAY_MS);
  }

  function handleCreate(input: IdeaDraftInput) {
    const idea = buildOwnIdea(input, nowIso, `own-${ownCount + 1}`);
    setOwnCount((n) => n + 1);
    setIdeas((prev) => [idea, ...prev]);
    setView("pending");
    showToast("Idea creada y guardada.");
  }

  const nothingToShow =
    view === "pending" ? proposals.length + kept.length === 0 : history.length === 0;

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
                hint="No se guardan: si no eliges ni guardas, desaparecen."
                count={proposals.length}
              >
                {proposals.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    nowIso={nowIso}
                    picking={pickingId === idea.id}
                    saveState={saveStates[idea.id] ?? "idle"}
                    onPick={handlePick}
                    onSave={handleSave}
                    onDismiss={handleDismiss}
                  />
                ))}
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
