import { useState } from "react";
import { ArrowRight, CalendarClock, Copy } from "lucide-react";
import ArticlePreviewSheet from "./ArticlePreviewSheet";
import BackStepButton from "./BackStepButton";
import ChannelStepDone from "./ChannelStepDone";
import DraftTextBlock from "./DraftTextBlock";
import FieldError from "./FieldError";
import HeroImageBlock from "./HeroImageBlock";
import ScheduleField from "./ScheduleField";
import StepActions from "./StepActions";
import StepSection from "./StepSection";
import WizardSteps, { buildWizardSteps } from "./WizardSteps";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import {
  mockGenerateDraft,
  mockImageVariants,
  mockImproveSeoTitle,
  MOCK_HERO_IMAGE,
  type MockImageVariant,
} from "@/lib/editorial-mocks";
import { getChannel, type ChannelSpec } from "@/lib/editorial-channels";
import { formatPublishSchedule } from "@/lib/editorial-utils";
import { isChannelDraftValid, validateChannelDraft } from "@/lib/editorial-validation";
import type { PublishChannel } from "@/lib/editorial-types";

/** Fake latencies (prototype only). */
const EDIT_IMAGE_DELAY_MS = 1600;
const HANDOFF_DELAY_MS = 900;
const COPIED_FEEDBACK_MS = 2500;

interface Props {
  /** Channel this screen is for. */
  channel: PublishChannel;
  /** Every channel chosen in step ②, in order, to build the step indicator. */
  channels: PublishChannel[];
  /** Brief carried over from step ②. */
  briefTitle: string;
  briefAngle: string;
  /** Carried forward into the next channel's URL, when there is one. */
  ideaId?: string | null;
}

/**
 * Steps ③ and ④ of the editorial wizard: one screen per chosen channel.
 *
 * The same component serves both, parameterized by `editorial-channels.ts`,
 * because the screen is the same three blocks — text, image, date — and only the
 * ending differs:
 *
 * - **Motor.es** hands off by copying. Confirmed by Fer (2026-07-25): there is no
 *   integration with their CMS, he pastes the text and uploads the image there
 *   himself, and what stays here is the backup copy.
 * - **EVminds** is ours, so the piece is scheduled from here.
 *
 * PROTOTYPE: the draft is canned, the AI image edit is a CSS filter, and the
 * hand-off is a timeout. No backend.
 */
export default function PublishChannelStep({
  channel,
  channels,
  briefTitle,
  briefAngle,
  ideaId,
}: Props) {
  const spec: ChannelSpec = getChannel(channel);
  const steps = buildWizardSteps(channels);
  const index = channels.indexOf(channel);
  const nextChannel = channels[index + 1];

  // The draft was already generated at the end of step ②, so it is here on
  // arrival: making the user wait a second time for the same work would be a
  // fake loading state.
  const [draft] = useState(() => mockGenerateDraft(briefTitle, briefAngle));
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);

  const [imageUrl, setImageUrl] = useState(MOCK_HERO_IMAGE);
  const [editPrompt, setEditPrompt] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [variants, setVariants] = useState<MockImageVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [improvingSeo, setImprovingSeo] = useState(false);
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [done, setDone] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  const errors = validateChannelDraft({ title, body, imageUrl, publishDate, publishTime });

  const missing: string[] = [];
  if (errors.title || errors.body) missing.push("revisa el texto");
  if (errors.image) missing.push("sube la imagen de cabecera");
  if (errors.schedule) missing.push("elige cuándo se publica");

  const busy = handingOff || navigating || editing || generatingImage || savingDraft;

  /** Set only when there is another channel screen after this one. */
  const nextSpec = nextChannel ? getChannel(nextChannel) : null;

  /** Copy is a repeatable utility, so it never locks anything. */
  function copyText(text: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  /** Last chance to fix the headline, in case step ② skipped the SEO pass. */
  function handleImproveSeo() {
    setImprovingSeo(true);
    window.setTimeout(() => {
      setTitle(mockImproveSeoTitle(title));
      setImprovingSeo(false);
    }, EDIT_IMAGE_DELAY_MS);
  }

  function handleEditImage() {
    setEditing(true);
    window.setTimeout(() => {
      setVariants(mockImageVariants(imageUrl, editPrompt));
      setSelectedVariantId(null);
      setEditing(false);
    }, EDIT_IMAGE_DELAY_MS);
  }

  /** Generating from scratch lands on the same pick-one-of-three as editing. */
  function handleGenerateImage() {
    setGeneratingImage(true);
    window.setTimeout(() => {
      setImageUrl(MOCK_HERO_IMAGE);
      setVariants(mockImageVariants(MOCK_HERO_IMAGE, generatePrompt));
      setSelectedVariantId(null);
      setGeneratingImage(false);
    }, EDIT_IMAGE_DELAY_MS);
  }

  /**
   * Saving a draft is the one thing that works with an incomplete piece: an
   * image is required to publish, never to keep what you have written.
   */
  function handleSaveDraft() {
    setSavingDraft(true);
    window.setTimeout(() => {
      setSavingDraft(false);
      showToast("Borrador guardado. Puedes seguir cuando quieras.");
    }, HANDOFF_DELAY_MS);
  }

  /**
   * Picking a variation updates the big preview above, which is the whole point:
   * the thumbnails are small, and the decision is about the image that will
   * actually be published.
   *
   * PROTOTYPE: the real version swaps the URL for the generated one and this
   * filter disappears. Here every variation is the same file, so the choice
   * travels as a CSS filter on the preview.
   */
  function handleSelectVariant(variant: MockImageVariant) {
    setSelectedVariantId(variant.id);
    setImageUrl(variant.url);
  }

  function handleDiscardVariants() {
    setVariants([]);
    setSelectedVariantId(null);
  }

  /** A different upload invalidates whatever the AI returned for the old one. */
  function handleImageChange(url: string) {
    setImageUrl(url);
    handleDiscardVariants();
  }

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);

  /**
   * The screen's one action, and what it does depends on where this channel
   * sits in the chosen list:
   *
   * - **Not the last channel:** just moves on to the next one's screen. It does
   *   NOT copy or schedule anything — that would duplicate the copy button
   *   already sitting next to the text (Fer, 2026-07-25), and the point of this
   *   click is progressing through the wizard, not finishing this channel.
   * - **The last channel:** actually hands the piece off — copies for Motor.es,
   *   schedules for EVminds — and lands on the completion screen.
   *
   * Either way it is gated on the same validation, because "seguir" without a
   * finished piece would just push an incomplete draft one step further.
   */
  function handlePrimary() {
    if (!isChannelDraftValid(errors)) return;

    if (nextSpec) {
      setNavigating(true);
      window.setTimeout(() => {
        const params = new URLSearchParams({ canales: channels.join(","), canal: nextSpec.value });
        if (ideaId) params.set("idea", ideaId);
        window.location.href = `/admin/redaccion/texto?${params}`;
      }, HANDOFF_DELAY_MS);
      return;
    }

    setHandingOff(true);
    if (spec.handoff === "copy") copyText(`${title}\n\n${body}`);
    window.setTimeout(() => {
      setHandingOff(false);
      setDone(true);
    }, HANDOFF_DELAY_MS);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <WizardSteps steps={steps} current={3 + index} />
        <ChannelStepDone
          title={spec.doneTitle}
          hint={spec.doneHint}
          piece={{
            title,
            imageUrl,
            imageFilter: selectedVariant?.filter,
            schedule: formatPublishSchedule(publishDate, publishTime),
            // "Programada" only where we are the ones publishing; on Motor.es
            // the date is a forecast of what someone else will do.
            scheduleLabel: spec.handoff === "schedule" ? "Programada" : "Prevista",
          }}
          // Straight back to the form. The state never left, so nothing has to
          // be reloaded and nothing is lost — which is the whole reason this is
          // a state flip and not a navigation.
          onEdit={() => setDone(false)}
          result={
            spec.resultLabel && spec.resultHref
              ? { label: spec.resultLabel, href: spec.resultHref }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps steps={steps} current={3 + index} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackStepButton href="/admin/redaccion/enfoque" dirty disabled={busy} />
      </div>

      <div className="grid gap-4">
        <StepSection
          title={`El texto para ${spec.name}`}
          hint="Escrito con tu enfoque. Edítalo todo lo que quieras: lo que se copia es lo que ves aquí."
        >
          <DraftTextBlock
            title={title}
            body={body}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            copied={copied}
            onCopy={copyText}
            onPreview={() => setPreviewOpen(true)}
            // Previewing without the hero image would be showing a piece that
            // cannot be published, and hiding the reason why.
            previewBlockedReason={
              errors.image ? "Para previsualizar hace falta la imagen de cabecera." : null
            }
            improvingSeo={improvingSeo}
            onImproveSeo={handleImproveSeo}
            disabled={busy}
          />
          <FieldError message={errors.title ?? errors.body} />
        </StepSection>

        <StepSection
          title="La imagen de cabecera"
          hint="Obligatoria para publicar. Sube la tuya y, si quieres, deja que la IA la retoque."
        >
          <HeroImageBlock
            value={imageUrl}
            onChange={handleImageChange}
            editPrompt={editPrompt}
            onEditPromptChange={setEditPrompt}
            editing={editing}
            onEdit={handleEditImage}
            generatePrompt={generatePrompt}
            onGeneratePromptChange={setGeneratePrompt}
            generating={generatingImage}
            onGenerate={handleGenerateImage}
            variants={variants}
            selectedVariantId={selectedVariantId}
            previewFilter={selectedVariant?.filter}
            onSelectVariant={handleSelectVariant}
            onDiscardVariants={handleDiscardVariants}
            disabled={busy}
          />
          <FieldError message={errors.image} />
        </StepSection>

        <StepSection title="Cuándo se publica">
          <ScheduleField
            date={publishDate}
            time={publishTime}
            onDateChange={setPublishDate}
            onTimeChange={setPublishTime}
            label={spec.dateLabel}
            hint={spec.dateHint}
            error={errors.schedule}
            disabled={busy}
          />
        </StepSection>

        {/* What this button does changes with position in the chosen channels,
            not with the channel itself: mid-wizard it only advances (Fer,
            2026-07-25), and only the last screen actually hands the piece off. */}
        <StepActions
          label={nextSpec ? `Seguir con ${nextSpec.name}` : spec.finalLabel}
          runningLabel={nextSpec ? "Cargando…" : spec.finalRunningLabel}
          running={nextSpec ? navigating : handingOff}
          onClick={handlePrimary}
          icon={nextSpec ? undefined : spec.handoff === "copy" ? <Copy /> : <CalendarClock />}
          trailingIcon={nextSpec ? <ArrowRight data-icon="inline-end" /> : undefined}
          missing={missing}
          missingPrefix={nextSpec ? "Antes de seguir" : "Antes de terminar"}
          readyHint={
            nextSpec
              ? `El texto y la imagen de ${spec.name} se quedan como están; podrás volver a retocarlos después.`
              : spec.handoff === "copy"
                ? "Se copiará al portapapeles y quedará guardada la copia de respaldo."
                : "Quedará programado y podrás cambiar la fecha después desde Artículos."
          }
          minWidth="16rem"
          secondary={{
            label: "Guardar borrador",
            runningLabel: "Guardando…",
            running: savingDraft,
            onClick: handleSaveDraft,
          }}
        />
      </div>

      <ArticlePreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        body={body}
        imageUrl={imageUrl}
        imageFilter={selectedVariant?.filter}
        channelName={spec.name}
      />
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
