import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Copy } from "lucide-react";
import ArticlePreviewSheet from "./ArticlePreviewSheet";
import BackStepButton from "./BackStepButton";
import ChannelStepDone from "./ChannelStepDone";
import DraftTextBlock from "./DraftTextBlock";
import FieldError from "./FieldError";
import HeroImageBlock from "./HeroImageBlock";
import PostRecordFields from "./PostRecordFields";
import QuickDatePicker from "./QuickDatePicker";
import ScheduleField from "./ScheduleField";
import StepActions from "./StepActions";
import StepSection from "./StepSection";
import WizardSteps, { buildWizardSteps } from "./WizardSteps";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import {
  mockGenerateDraft,
  mockImageVariants,
  mockDescribeImage,
  mockImproveSeoTitle,
  mockPostRecord,
  MOCK_HERO_IMAGE,
  type MockImageVariant,
} from "@/lib/editorial-mocks";
import { getChannel, type ChannelSpec } from "@/lib/editorial-channels";
import { formatPublishSchedule, shiftDateByDays } from "@/lib/editorial-utils";
import {
  isChannelDraftValid,
  isPublishDatePast,
  validateChannelDraft,
} from "@/lib/editorial-validation";
import type { PostCategory } from "@/lib/post-categories";
import { slugify } from "@/lib/slugify";
import type { PublishChannel } from "@/lib/editorial-types";

/** Fake latencies (prototype only). */
const EDIT_IMAGE_DELAY_MS = 1600;
const DESCRIBE_IMAGE_DELAY_MS = 1100;
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
  /**
   * "Now" in Madrid, as wall-clock strings (`YYYY-MM-DD` and `HH:MM`), computed
   * by the page. Never derive them here: `Date` inside a hydrated island answers
   * differently on the server than on the client.
   */
  todayInMadrid: string;
  nowHourInMadrid: string;
  /**
   * Publish date chosen on the previous channel's screen, `YYYY-MM-DD`.
   *
   * Travels in the URL (`?fecha=`) because each channel is its own page. When it
   * is here, this channel's date starts a week later — Fer's rule (2026-07-26):
   * EVminds publishes a week after Motor.es, so the common answer should already
   * be in the field rather than being worked out by hand every time.
   */
  previousChannelDate?: string | null;
}

/** How long after the previous channel this one publishes, in days. */
const CHANNEL_GAP_DAYS = 7;

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
 * - **EVminds** is ours, so the piece is scheduled from here — which is not
 *   handing a text to someone, it is creating a row in `posts`. That row needs a
 *   slug, an excerpt, a category, tags and an alt text, so this channel grows a
 *   fourth block (`PostRecordFields`) that Motor.es never shows, and its text is
 *   a **different draft**, not the same one (Fer, 2026-07-26).
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
  todayInMadrid,
  nowHourInMadrid,
  previousChannelDate,
}: Props) {
  const spec: ChannelSpec = getChannel(channel);
  const steps = buildWizardSteps(channels);
  const index = channels.indexOf(channel);
  const nextChannel = channels[index + 1];

  // The draft was already generated at the end of step ②, so it is here on
  // arrival: making the user wait a second time for the same work would be a
  // fake loading state. It is generated PER CHANNEL — one brief, two different
  // texts — so the two pieces don't compete with each other in search results.
  const [draft] = useState(() => mockGenerateDraft(channel, briefTitle, briefAngle));
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);

  // The `posts` record, only meaningful where we host the piece. Excerpt,
  // category and tags arrive proposed by the AI and editable (Fer, 2026-07-26):
  // they are all derivable from the text it just wrote, and a pre-filled record
  // is never a blank page.
  const [record] = useState(() => mockPostRecord(draft.title, draft.body));
  const [excerpt, setExcerpt] = useState(record.excerpt);
  const [category, setCategory] = useState<PostCategory>(record.category);
  const [tags, setTags] = useState<string[]>(record.tags);
  // The alt text is written by the AI from the image itself, and rewritten
  // whenever the image changes — unless it has been edited by hand, in which case
  // the person's words win and the button is there to redo it on purpose.
  const [imageAlt, setImageAlt] = useState("");
  const [altEdited, setAltEdited] = useState(false);
  const [describingAlt, setDescribingAlt] = useState(false);
  const [slug, setSlug] = useState(() => slugify(draft.title));
  const [slugEdited, setSlugEdited] = useState(false);
  // Errors on these two show on blur, like step ②: complaining about an empty
  // field on arrival would be scolding someone for not having typed yet.
  const [excerptTouched, setExcerptTouched] = useState(false);
  const [altTouched, setAltTouched] = useState(false);

  const [imageUrl, setImageUrl] = useState(MOCK_HERO_IMAGE);
  const [editPrompt, setEditPrompt] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [variants, setVariants] = useState<MockImageVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [improvingSeo, setImprovingSeo] = useState(false);
  // A week after the previous channel, when there was one. Prefilled and not
  // merely suggested: the rule is fixed, so making it the starting value is one
  // decision less, and it stays editable for the exceptions.
  const defaultPublishDate = previousChannelDate
    ? shiftDateByDays(previousChannelDate, CHANNEL_GAP_DAYS)
    : "";
  const [publishDate, setPublishDate] = useState(defaultPublishDate);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [done, setDone] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  const errors = validateChannelDraft({
    title,
    body,
    imageUrl,
    publishDate,
    // Its presence is what turns on the `posts` rules; on Motor.es there is no
    // record to validate.
    postRecord: spec.needsPostRecord ? { slug, excerpt, imageAlt } : undefined,
  });

  /**
   * Only where we control the hour: with it fixed at 8:00, picking today once
   * 8:00 has gone means publishing immediately, not scheduling. Warned about,
   * never blocked.
   */
  const scheduleWarning = isPublishDatePast(
    publishDate,
    spec.publishHour,
    todayInMadrid,
    nowHourInMadrid,
  )
    ? "Ese día ya ha pasado la hora de publicación, así que saldría en cuanto lo programes."
    : null;

  const missing: string[] = [];
  if (errors.title || errors.body) missing.push("revisa el texto");
  if (errors.image) missing.push("sube la imagen de cabecera");
  // Names the field exactly as the field labels itself: this line sits under the
  // primary button, far from what it is talking about, so "describe la imagen"
  // sent Fer looking at the image block instead of at the input below it.
  if (errors.imageAlt) {
    missing.push(
      describingAlt
        ? "espera a que la IA describa la imagen"
        : "escribe el texto alternativo de la imagen",
    );
  }
  if (errors.excerpt || errors.slug) missing.push("completa la ficha del artículo");
  if (errors.schedule) missing.push("elige cuándo se publica");

  const busy = handingOff || navigating || editing || generatingImage || savingDraft;

  /** Set only when there is another channel screen after this one. */
  const nextSpec = nextChannel ? getChannel(nextChannel) : null;
  /** The channel this screen follows, for naming where the prefilled date came from. */
  const previousChannel = channels[index - 1];
  const previousSpec = previousChannel ? getChannel(previousChannel) : null;

  /**
   * Where "Volver atrás" lands: the **previous channel's screen** when there is
   * one, and only the brief when this is the first channel.
   *
   * It used to be hardcoded to step ②, which was right for step ③ and wrong for
   * step ④: from EVminds it jumped over Motor.es straight back to the brief (Fer,
   * 2026-07-26). No `?fecha=` on the way back — that parameter means "the date of
   * the channel before the one you are opening", and the first channel has none.
   */
  const backHref = (() => {
    if (!previousSpec) return "/admin/redaccion/enfoque";
    const params = new URLSearchParams({ canales: channels.join(","), canal: previousSpec.value });
    if (ideaId) params.set("idea", ideaId);
    return `/admin/redaccion/texto?${params}`;
  })();

  /** Copy is a repeatable utility, so it never locks anything. */
  function copyText(text: string) {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  /**
   * Ask the AI to describe the current image.
   *
   * PROTOTYPE: a timeout over `mockDescribeImage`. The real call hands the image
   * to the multimodal model and asks for one sentence.
   */
  function describeImage(url: string) {
    setDescribingAlt(true);
    window.setTimeout(() => {
      setImageAlt(mockDescribeImage(url));
      setAltEdited(false);
      setAltTouched(false);
      setDescribingAlt(false);
    }, DESCRIBE_IMAGE_DELAY_MS);
  }

  /**
   * Describe whatever image the screen arrives with.
   *
   * Runs once, and only where there is a `posts` record to fill: on Motor.es the
   * alt is written in their CMS, not here. Guarded on the alt being empty so a
   * re-render can never overwrite something already written.
   */
  useEffect(() => {
    if (!spec.needsPostRecord || !imageUrl || imageAlt || describingAlt) return;
    describeImage(imageUrl);
    // Empty deps on purpose: this is the arrival pass. Later image changes go
    // through `handleImageChange`, which is the only place that knows whether the
    // alt was written by hand and must be left alone.
  }, []);

  /**
   * Every headline change goes through here so the slug can follow it, exactly
   * like `PostEditor` does — including the one "Mejorar SEO" makes, which is the
   * case a plain `setTitle` would silently miss and leave the URL pointing at
   * the old wording.
   */
  function applyTitle(next: string) {
    setTitle(next);
    if (!slugEdited) setSlug(slugify(next));
  }

  /** Last chance to fix the headline, in case step ② skipped the SEO pass. */
  function handleImproveSeo() {
    setImprovingSeo(true);
    window.setTimeout(() => {
      applyTitle(mockImproveSeoTitle(title));
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

  /**
   * A different upload invalidates whatever the AI returned for the old one —
   * both the variations and, unless it was written by hand, the alt text. An alt
   * describing the previous photo is worse than no alt at all, because it is
   * confidently wrong and nothing on screen says so.
   */
  function handleImageChange(url: string) {
    setImageUrl(url);
    handleDiscardVariants();
    if (spec.needsPostRecord && url && !altEdited) describeImage(url);
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
        // So the next channel can start a week after this one. It travels in the
        // URL because each channel is a separate page, and that also means a
        // reload of that page keeps the right default.
        if (publishDate) params.set("fecha", publishDate);
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
        {/* Every step ticked: the piece is out, so the map must agree with the
            green check underneath it (Fer, 2026-07-26). */}
        <WizardSteps steps={steps} current={3 + index} complete />
        <ChannelStepDone
          title={spec.doneTitle}
          hint={spec.doneHint}
          piece={{
            title,
            imageUrl,
            imageFilter: selectedVariant?.filter,
            // The hour is shown where we set one, so the card says exactly when
            // the piece goes out instead of leaving the automatic part implicit.
            // On Motor.es there is no hour to show: it is their system's call.
            schedule: formatPublishSchedule(publishDate, spec.publishHour ?? ""),
            // "Programada" only where we are the ones publishing; on Motor.es
            // the date is a forecast of what someone else will do.
            scheduleLabel: spec.handoff === "schedule" ? "Programada" : "Prevista",
            // The URL only exists where we host the piece, and it is the one
            // thing on this card that can't be changed for free later.
            url: spec.needsPostRecord ? `evminds.es/articulo/${slug}` : undefined,
          }}
          // Straight back to the form. The state never left, so nothing has to
          // be reloaded and nothing is lost — which is the whole reason this is
          // a state flip and not a navigation.
          onEdit={() => setDone(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps steps={steps} current={3 + index} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackStepButton
          href={backHref}
          dirty
          confirmTitle={
            previousSpec ? `¿Volver al texto de ${previousSpec.name}?` : "¿Volver al enfoque?"
          }
          // Honest about what is lost, which is not the same in the two cases.
          // Nothing is persisted yet in this phase (see the "Guardar y seguir
          // luego" note in the design log), so going back really does discard
          // this screen's work.
          confirmDescription={
            previousSpec
              ? `Se perderá el texto de ${spec.name}, la imagen y la fecha que has puesto aquí: todavía no se guardan en ningún sitio. Al volver, ${previousSpec.name} se generará de nuevo desde tu enfoque.`
              : `Se perderá el texto de ${spec.name}, la imagen y la fecha que has puesto aquí: todavía no se guardan en ningún sitio. Tu enfoque sigue como lo dejaste.`
          }
          disabled={busy}
        />
      </div>

      <div className="grid gap-4">
        <StepSection title={`El texto para ${spec.name}`} hint={spec.draftHint}>
          <DraftTextBlock
            title={title}
            body={body}
            onTitleChange={applyTitle}
            onBodyChange={setBody}
            copied={copied}
            // Only where copying IS the hand-off. On EVminds a prominent
            // "Copiar el HTML" would suggest the piece needs pasting somewhere
            // to go out, which is the misunderstanding the done screen fights.
            onCopy={spec.handoff === "copy" ? copyText : undefined}
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
          hint="Obligatoria para publicar. Sube la tuya y, si quieres, deja que la IA la edite."
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
            alt={
              spec.needsPostRecord
                ? {
                    value: imageAlt,
                    onChange: (next: string) => {
                      setImageAlt(next);
                      setAltEdited(true);
                    },
                    onBlur: () => setAltTouched(true),
                    describing: describingAlt,
                    onDescribe: () => describeImage(imageUrl),
                    error: altTouched ? errors.imageAlt : null,
                  }
                : undefined
            }
            disabled={busy}
          />
          <FieldError message={errors.image} />
        </StepSection>

        {/* Only on a channel we host: these are the `posts` columns, and they
            have no meaning for a text handed to someone else's CMS. */}
        {spec.needsPostRecord && (
          <StepSection
            title="La ficha del artículo"
            hint="Cómo se encuentra la pieza en evminds.es. La rellena la IA; repásala."
          >
            <PostRecordFields
              slug={slug}
              onSlugChange={setSlug}
              onSlugManualEdit={() => setSlugEdited(true)}
              excerpt={excerpt}
              onExcerptChange={setExcerpt}
              onExcerptBlur={() => setExcerptTouched(true)}
              excerptError={excerptTouched ? errors.excerpt : null}
              category={category}
              onCategoryChange={setCategory}
              tags={tags}
              onTagsChange={setTags}
              slugError={errors.slug}
              disabled={busy}
            />
          </StepSection>
        )}

        <StepSection title="Cuándo se publica">
          <ScheduleField
            date={publishDate}
            onDateChange={setPublishDate}
            label={spec.dateLabel}
            // Where the prefilled date came from, said out loud: a date that
            // appears on its own with no explanation is the kind of automatic
            // behaviour people work around instead of trusting.
            hint={
              previousChannelDate && previousSpec
                ? `Viene puesta una semana después de ${previousSpec.name}. ${spec.dateHint}`
                : spec.dateHint
            }
            warning={scheduleWarning}
            // Shortcuts only where the date arrives empty (Fer, 2026-07-26). On a
            // channel that follows another the field is already filled with the
            // week-later rule, so offering "hoy / mañana" there would reopen a
            // question that is already answered.
            quickPick={
              previousChannelDate ? undefined : (
                <QuickDatePicker
                  today={todayInMadrid}
                  value={publishDate}
                  onPick={setPublishDate}
                  disabled={busy}
                />
              )
            }
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
