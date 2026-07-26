import { useEffect, useRef, useState } from "react";
import { ArrowRight, Wand2 } from "lucide-react";
import BackStepButton from "./BackStepButton";
import ChannelPicker from "./ChannelPicker";
import StepActions from "./StepActions";
import PickedIdeaNote from "./PickedIdeaNote";
import ReferenceLinksField from "./ReferenceLinksField";
import StepSection from "./StepSection";
import TopicFields from "./TopicFields";
import WizardSteps, { buildWizardSteps } from "./WizardSteps";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import { mockExpandAngle, mockImproveSeoTitle, mockReadReferenceLink } from "@/lib/editorial-mocks";
import { isBriefValid, validateBrief } from "@/lib/editorial-validation";
import type { IdeaCandidate, PublishChannel, ReferenceLink } from "@/lib/editorial-types";

/** Fake latencies (prototype only). */
const EXPAND_DELAY_MS = 1100;
const READ_DELAY_MS = 1200;

interface Props {
  /** Present when arriving from a picked proposal (route A). */
  idea?: IdeaCandidate | null;
}

/**
 * Step ② of the editorial wizard: define the angle.
 *
 * This is the only moment to steer the redactor before it writes, so the screen
 * is built around three questions and nothing else: what you want to say, what
 * it should read first (requirement R1), and where it gets published.
 *
 * It serves both entry routes with the same fields — prefilled when a proposal
 * was picked, empty but never blank when starting from scratch.
 *
 * The step indicator lives inside this island rather than on the page, so that
 * ticking EVminds visibly turns the wizard from three steps into four.
 *
 * PROTOTYPE: every action is simulated in local state — no backend.
 */
export default function DefineAngleStep({ idea }: Props) {
  const [title, setTitle] = useState(idea?.proposed_title_es ?? "");
  const [angle, setAngle] = useState(idea?.angle ?? "");
  const [expanding, setExpanding] = useState(false);
  const [improvingSeo, setImprovingSeo] = useState(false);
  const [links, setLinks] = useState<ReferenceLink[]>(() =>
    (idea?.reference_urls ?? []).map((url, i) => ({
      id: `link-${i}`,
      url,
      status: "reading" as const,
      title: null,
      error: null,
    })),
  );
  // Motor.es is ticked by default: it is the only channel in the MVP and the
  // reason the flow exists, so the common case needs no decision.
  const [channels, setChannels] = useState<PublishChannel[]>(["motor"]);
  const [generating, setGenerating] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  /** What arrived with the idea, to tell "typed something" from "untouched". */
  const initial = useRef({ title, angle });
  const nextLinkId = useRef(links.length);
  /** Attempts per link, so a retry can succeed where the first read failed. */
  const attempts = useRef<Record<string, number>>({});

  /** Simulated fetch of one link. The real version is a single server call. */
  function readLink(link: ReferenceLink) {
    const attempt = (attempts.current[link.id] ?? 0) + 1;
    attempts.current[link.id] = attempt;

    setLinks((prev) =>
      prev.map((l) =>
        l.id === link.id ? { ...l, status: "reading", title: null, error: null } : l,
      ),
    );

    window.setTimeout(() => {
      const result = mockReadReferenceLink(link.url, attempt);
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id
            ? result.ok
              ? { ...l, status: "read", title: result.title, error: null }
              : { ...l, status: "failed", title: null, error: result.error }
            : l,
        ),
      );
    }, READ_DELAY_MS);
  }

  // Links carried over from the idea start reading on arrival, same as ones
  // added by hand: the state is only useful if it is resolved before generating.
  const initialLinks = useRef(links);
  // Mount only: the ref keeps the initial list stable so this never re-runs.
  useEffect(() => {
    for (const link of initialLinks.current) readLink(link);
  }, []);

  function handleAddLink(url: string): string | null {
    if (links.some((l) => l.url === url)) return "Ese enlace ya está en la lista.";
    const link: ReferenceLink = {
      id: `link-${nextLinkId.current++}`,
      url,
      status: "reading",
      title: null,
      error: null,
    };
    setLinks((prev) => [...prev, link]);
    readLink(link);
    return null;
  }

  function handleRemoveLink(link: ReferenceLink) {
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
  }

  function handleExpand() {
    setExpanding(true);
    window.setTimeout(() => {
      setAngle(mockExpandAngle(title, angle));
      setExpanding(false);
    }, EXPAND_DELAY_MS);
  }

  /**
   * Rewrites the headline so the searchable part goes first. It replaces the
   * field rather than proposing an alternative below it: the previous text is
   * one Ctrl+Z away in the input, and a "which of these two do you prefer"
   * comparison would be a second decision on a screen that already has three.
   */
  function handleImproveSeo() {
    setImprovingSeo(true);
    window.setTimeout(() => {
      setTitle(mockImproveSeoTitle(title));
      setImprovingSeo(false);
    }, EXPAND_DELAY_MS);
  }

  /**
   * Writes the brief as a durable piece and returns its id, or null if it failed.
   *
   * **This is where the row is born** (Fer, 2026-07-26), not at the first
   * "Guardar borrador" on the next screen: an interruption before remembering to
   * press that button would lose everything, and from phase 3 on it would lose a
   * paid generation too. Not on arrival either, which would leave an empty piece
   * behind every visit to this screen.
   *
   * Shared by the two ways out of this step so they cannot store different
   * things — the only difference between them is where you land afterwards.
   */
  async function createPiece(): Promise<string | null> {
    try {
      const res = await fetch("/admin/redaccion/save-piece", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefTitle: title,
          briefAngle: angle,
          // Only the links that were actually read make it into the piece: a URL
          // that failed to load is not documentation, and storing it would let a
          // later screen claim it was part of the brief.
          referenceUrls: links.filter((l) => l.status === "read").map((l) => l.url),
          channels,
          ideaId: idea?.id ?? null,
          sourceName: idea?.source_name ?? null,
          sourceUrl: idea?.source_url ?? null,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? `save-piece responded ${res.status}`);
      return data.id;
    } catch (err) {
      console.error("no se pudo crear la pieza:", err);
      // Never a dead end: the brief is still on screen, so retrying is one click.
      showToast("No se ha podido guardar la pieza. Inténtalo otra vez.", "error");
      return null;
    }
  }

  /**
   * Creates the piece with whatever the brief has so far and leaves.
   *
   * **Back after being cut from the MVP** (it was built and removed on
   * 2026-07-25): the reason it went was that a button promising to save your work
   * with nowhere to save it is worse than no button. Both halves of that now
   * exist — the durable row and the list of pieces to come back to — so it
   * returns, landing on the list so you can see where it went.
   */
  async function handleSaveForLater() {
    if (!title.trim() || channels.length === 0) return;
    setSavingBrief(true);
    const id = await createPiece();
    if (!id) {
      setSavingBrief(false);
      return;
    }
    window.location.href = "/admin/redaccion/piezas";
  }

  /** Creates the piece and goes on to write it. The step's one primary action. */
  async function handleGenerate() {
    // The button is already disabled when this is false; this is the belt to
    // that pair of braces, so a stray keyboard activation can't skip the checks.
    if (!isBriefValid(validateBrief(title, angle)) || channels.length === 0) return;
    setGenerating(true);

    const id = await createPiece();
    if (!id) {
      setGenerating(false);
      return;
    }

    const params = new URLSearchParams({ canales: channels.join(","), pieza: id });
    if (idea) params.set("idea", idea.id);
    window.location.href = `/admin/redaccion/texto?${params}`;
  }

  /**
   * One source of truth for "can this move on": the same validation feeds the
   * per-field messages and the summary under the button, so they can never
   * disagree about what is wrong.
   */
  const errors = validateBrief(title, angle);

  const missing: string[] = [];
  if (!isBriefValid(errors)) missing.push("completa el titular y qué quieres contar");
  if (channels.length === 0) missing.push("elige dónde se publica");
  if (links.some((l) => l.status === "reading")) missing.push("espera a que se lean los enlaces");

  const readCount = links.filter((l) => l.status === "read").length;
  const busy = generating;

  // Nothing here is persisted yet, so "has been touched" is what decides whether
  // leaving needs a confirmation. Links count: they took a fetch each.
  const dirty =
    title !== initial.current.title ||
    angle !== initial.current.angle ||
    links.length > (idea?.reference_urls.length ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps steps={buildWizardSteps(channels)} current={2} />

      {/* Same row and same shape as "Ver historial" in step ①: the secondary
          navigation of this section always sits here. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackStepButton dirty={dirty} disabled={busy} />
      </div>

      {/* Full width, like the cards in step ①: the reading measure is applied to
          the prose inside each block, never to the block itself. */}
      <div className="grid gap-4">
        <StepSection
          title="Qué vas a escribir"
          hint={
            idea
              ? "Esto es lo que dirige al redactor. Cámbialo si quieres que apunte a otro sitio."
              : "Cuéntalo como te salga, aunque sea una frase: la IA puede desarrollarla."
          }
        >
          {idea && <PickedIdeaNote idea={idea} />}
          <TopicFields
            title={title}
            angle={angle}
            onTitleChange={setTitle}
            onAngleChange={setAngle}
            errors={errors}
            expanding={expanding}
            onExpand={handleExpand}
            improvingSeo={improvingSeo}
            onImproveSeo={handleImproveSeo}
            disabled={busy}
          />
          {!idea && (
            <p className="text-xs text-muted-foreground">
              ¿Prefieres partir de una propuesta?{" "}
              <a
                href="/admin/redaccion"
                className="underline underline-offset-4 hover:no-underline"
              >
                Mira las ideas de hoy
              </a>
              .
            </p>
          )}
        </StepSection>

        <StepSection
          title="Qué debe leerse antes"
          hint="Enlaces que quieres que el redactor lea para documentar la pieza. Opcional."
          aside={
            links.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {readCount} de {links.length} leído{links.length === 1 ? "" : "s"}
              </span>
            ) : undefined
          }
        >
          <ReferenceLinksField
            links={links}
            onAdd={handleAddLink}
            onRetry={readLink}
            onRemove={handleRemoveLink}
            disabled={busy}
          />
        </StepSection>

        <StepSection
          title="Dónde se publica"
          hint="Puedes elegir los dos. Cada medio añade su propio paso al final para el texto, la imagen y la fecha."
        >
          <ChannelPicker value={channels} onChange={setChannels} disabled={busy} />
        </StepSection>

        {/* One way to finish the step, and nothing else. There is deliberately no
            "skip this step" button — arriving from a picked idea everything is
            prefilled and the channel defaulted, so this button already IS the
            one-click shortcut.

            "Guardar y seguir luego" is back beside it (it was built and dropped
            on 2026-07-25 for want of anywhere to save to). It is an escape, not a
            second way of finishing: it stores the brief and takes you to the list
            without generating anything. */}
        <StepActions
          label="Generar el borrador"
          runningLabel="Escribiendo el borrador…"
          running={generating}
          onClick={handleGenerate}
          icon={<Wand2 />}
          trailingIcon={<ArrowRight data-icon="inline-end" />}
          missing={missing}
          missingPrefix="Antes de generar"
          readyHint="Tardará un momento. Podrás editar el texto entero antes de publicar nada."
          secondary={{
            label: "Guardar y seguir luego",
            runningLabel: "Guardando…",
            running: savingBrief,
            onClick: handleSaveForLater,
            minWidth: "14rem",
            // A piece needs a name to be findable in the list and a channel to be
            // written for. Below that there is nothing worth storing, so the
            // button says no beforehand instead of failing after the click.
            disabled: !title.trim() || channels.length === 0,
          }}
        />
      </div>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
