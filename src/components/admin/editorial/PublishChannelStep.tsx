import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Check, Eye, Wand2 } from "lucide-react";
import ArticlePreviewSheet from "./ArticlePreviewSheet";
import BackStepButton from "./BackStepButton";
import ChannelStepDone from "./ChannelStepDone";
import CmsHeadlineFields, { type CopyBinding } from "./CmsHeadlineFields";
import CmsRecordFields from "./CmsRecordFields";
import CmsSearchFields from "./CmsSearchFields";
import CopyProgress from "./CopyProgress";
import DraftBodyField from "./DraftBodyField";
import DraftGeneratingLoader from "./DraftGeneratingLoader";
import DraftTextBlock from "./DraftTextBlock";
import EvmindsPreGenerateStep from "./EvmindsPreGenerateStep";
import FieldError from "./FieldError";
import HeroImageBlock from "./HeroImageBlock";
import LeadField from "./LeadField";
import PostRecordFields from "./PostRecordFields";
import PublicationRecordFields from "./PublicationRecordFields";
import QuickDatePicker from "./QuickDatePicker";
import ScheduleField from "./ScheduleField";
import StepActions from "./StepActions";
import StepSection from "./StepSection";
import WizardSteps, { buildWizardSteps } from "./WizardSteps";
import { Button } from "@/components/ui/button";
import Toast from "@/components/ui/toast";
import { useToast } from "@/lib/use-toast";
import {
  mockImageVariants,
  mockDescribeImage,
  mockPostRecord,
  MOCK_HERO_IMAGE,
  type MockImageVariant,
} from "@/lib/editorial-mocks";
import { getChannel, type ChannelSpec } from "@/lib/editorial-channels";
import type {
  ChannelDraftState,
  ChannelDraftStatus,
  ChannelPayload,
  EvmindsChannelPayload,
  MotorChannelPayload,
} from "@/lib/editorial-drafts";
import { channelUrl, pieceBriefUrl } from "@/lib/editorial-routes";
import { useDraftAutosave } from "@/lib/use-draft-autosave";
import { formatPublishSchedule, shiftDateByDays } from "@/lib/editorial-utils";
import {
  CMS_TITLE_MAX,
  isChannelDraftValid,
  isPublishDatePast,
  validateChannelDraft,
} from "@/lib/editorial-validation";
import { copyPlain, copyRich } from "@/lib/clipboard";
import { markdownToHtml } from "@/lib/markdown";
import { VALID_POST_CATEGORIES, type PostCategory } from "@/lib/post-categories";
import { slugify } from "@/lib/slugify";
import type { PublishChannel } from "@/lib/editorial-types";

/**
 * Fake latencies (prototype only).
 *
 * The hand-off one is gone: finishing and saving a draft are real requests now,
 * so their waiting time is the network's and inventing one on top would be a
 * loading state that lies.
 */
const EDIT_IMAGE_DELAY_MS = 1600;
const DESCRIBE_IMAGE_DELAY_MS = 1100;

interface Props {
  /** Channel this screen is for. */
  channel: PublishChannel;
  /** Every channel chosen in step ②, in order, to build the step indicator. */
  channels: PublishChannel[];
  /**
   * The durable piece this screen writes into, created when step ② was left.
   *
   * **Never null since phase 2b:** the piece is the path (`/pieza/<id>/<canal>`),
   * so a screen without one cannot be reached — the page redirects instead of
   * rendering an empty one. That removed every "there is nowhere to save" branch
   * this component used to carry.
   */
  pieceId: string;
  /**
   * What was already stored for this channel, if anything. Its presence is what
   * turns arrival into a **resume** instead of a generation: the screen comes
   * back exactly as it was left, image and dates included.
   */
  initialDraft: ChannelDraftState | null;
  /** Lifecycle of this channel's draft, so finishing it twice does not undo it. */
  initialStatus: ChannelDraftStatus;
  /** Brief carried over from step ②. */
  briefTitle: string;
  briefAngle: string;
  /**
   * The idea's original source, when the piece came from one.
   *
   * They prefill Motor.es' `Fuente` / `Url fuente`: we already know the answer
   * from step ①, so asking the model to guess at it — or asking Fer to retype it
   * — would both be worse than passing it along.
   */
  briefSourceName?: string | null;
  briefSourceUrl?: string | null;
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
   * **Read from that channel's row** by the page — it used to travel as `?fecha=`
   * and that is exactly how it got lost. When it is here, this channel's date
   * starts a week later, which is Fer's rule (2026-07-26): EVminds publishes a
   * week after Motor.es, so the common answer should already be in the field
   * rather than being worked out by hand every time.
   */
  previousChannelDate?: string | null;
}

/** How long after the previous channel this one publishes, in days. */
const CHANNEL_GAP_DAYS = 7;

interface SeedInput {
  channel: PublishChannel;
  initialDraft: ChannelDraftState | null;
  briefSourceName?: string | null;
  briefSourceUrl?: string | null;
  previousChannelDate?: string | null;
}

/**
 * The screen's starting values, from a stored draft or from a fresh generation.
 *
 * Kept out of the component because it is the one piece of arrival logic with
 * real branching in it, and because the "edited by hand" flags have to be
 * **derived** when resuming: they are not stored, and getting them wrong is
 * silent. A restored `Título Listados` that still equals the headline is still
 * following it; one that differs was changed on purpose and must stop being
 * overwritten. Same for the slug and the alt text.
 */
function buildSeed({
  channel,
  initialDraft,
  briefSourceName,
  briefSourceUrl,
  previousChannelDate,
}: SeedInput) {
  // A week after the previous channel, when there was one. Prefilled and not
  // merely suggested: the rule is fixed, so making it the starting value is one
  // decision less, and it stays editable for the exceptions.
  const defaultPublishDate = previousChannelDate
    ? shiftDateByDays(previousChannelDate, CHANNEL_GAP_DAYS)
    : "";

  if (initialDraft) {
    const { title, body, imageUrl, publishDate } = initialDraft;
    const motor = channel === "motor" ? (initialDraft.payload as MotorChannelPayload) : null;
    const evminds = channel === "evminds" ? (initialDraft.payload as EvmindsChannelPayload) : null;

    return {
      title,
      body,
      imageUrl: imageUrl ?? "",
      publishDate: publishDate ?? defaultPublishDate,
      listTitle: motor?.listTitle || title,
      listTitleEdited: Boolean(motor?.listTitle && motor.listTitle !== title),
      discoverTitle: motor?.discoverTitle ?? "",
      metaTitle: motor?.metaTitle ?? "",
      metaDescription: motor?.metaDescription ?? "",
      lead: motor?.lead ?? "",
      brand: motor?.brand ?? "",
      model: motor?.model ?? "",
      sourceName: motor?.sourceName ?? briefSourceName ?? "",
      sourceUrl: motor?.sourceUrl ?? briefSourceUrl ?? "",
      cmsTags: motor?.tags ?? [],
      published: motor?.published ?? false,
      publishedDate: motor?.publishedDate ?? "",
      publishedUrl: motor?.publishedUrl ?? "",
      slug: evminds?.slug || slugify(title),
      slugEdited: Boolean(evminds?.slug && evminds.slug !== slugify(title)),
      excerpt: evminds?.excerpt ?? "",
      category: evminds?.category ?? VALID_POST_CATEGORIES[0],
      tags: evminds?.tags ?? [],
      imageAlt: evminds?.imageAlt ?? "",
      // A restored alt was already written (by the AI or by hand), so it must not
      // be regenerated on arrival over an image that has not changed.
      altEdited: Boolean(evminds?.imageAlt),
      // Present even with an empty title: the row can already exist from an
      // autosave of the note alone, written before "Generar" was ever pressed.
      weeklyNotes: evminds?.weeklyNotes ?? "",
    };
  }

  // Nothing stored yet, either channel: no text to seed, and none is
  // generated here — a real Gemini call cannot be synchronous like the old
  // mock was. EVminds waits for an explicit "Generar" (`EvmindsPreGenerateStep`)
  // so "Qué ha cambiado esta semana" can reach the prompt BEFORE the call
  // fires, not after (Fer, 2026-07-27). Motor.es fires the same call
  // automatically on arrival instead (see the mount effect in the component
  // below) — it has no note to wait for, so there is nothing to gate on.
  return {
    title: "",
    body: "",
    imageUrl: "",
    publishDate: defaultPublishDate,
    listTitle: "",
    listTitleEdited: false,
    discoverTitle: "",
    metaTitle: "",
    metaDescription: "",
    lead: "",
    brand: "",
    model: "",
    sourceName: briefSourceName ?? "",
    sourceUrl: briefSourceUrl ?? "",
    cmsTags: [],
    published: false,
    publishedDate: "",
    publishedUrl: "",
    slug: "",
    slugEdited: false,
    excerpt: "",
    category: VALID_POST_CATEGORIES[0],
    tags: [],
    imageAlt: "",
    altEdited: false,
    weeklyNotes: "",
  };
}

/**
 * Steps ③ and ④ of the editorial wizard: one screen per chosen channel.
 *
 * The same component serves both, parameterized by `editorial-channels.ts`,
 * because the spine is the same — text, image, when — and what differs is what
 * finishing means:
 *
 * - **Motor.es** is transcribed by hand into someone else's CMS. Confirmed twice
 *   by Fer (2026-07-25, 2026-07-26): there is no integration and there never will
 *   be one to design. So this screen is **a reference sheet for their form**: its
 *   labels, its order, its help text, and a copy button per field that keeps
 *   saying "copiado" so you can see which ones you have already pasted.
 * - **EVminds** is ours, so the piece is scheduled from here — which is not
 *   handing a text to someone, it is creating a row in `posts`. That row needs a
 *   slug, an excerpt, a category, tags and an alt text, so this channel grows a
 *   block (`PostRecordFields`) that Motor.es never shows, and its text is a
 *   **different draft**, not the same one (Fer, 2026-07-26).
 *
 * The two field sets are switched by `needsCmsFields` / `needsPostRecord` on the
 * channel, never by an `if` on the channel's name, so a third channel is a row in
 * a table rather than an edit here.
 *
 * PROTOTYPE: the draft is canned, the AI image edit is a CSS filter, and the
 * hand-off is a timeout. No backend.
 */
export default function PublishChannelStep({
  channel,
  channels,
  pieceId,
  initialDraft,
  initialStatus,
  briefTitle,
  briefAngle,
  briefSourceName,
  briefSourceUrl,
  todayInMadrid,
  nowHourInMadrid,
  previousChannelDate,
}: Props) {
  const spec: ChannelSpec = getChannel(channel);
  const steps = buildWizardSteps(channels);
  const index = channels.indexOf(channel);
  const nextChannel = channels[index + 1];

  /**
   * Where this screen starts from.
   *
   * Two ways in, one shape out: a **resume**, when the piece already has a row
   * for this channel, or a **fresh generation** when it does not. Resolving that
   * once here is what keeps every field below from having to ask again which of
   * the two it came from — and asking twice is how half a screen ends up restored
   * and the other half regenerated.
   *
   * The generated path starts empty either way now — a real Gemini call can't
   * fill it in synchronously, so `generateDraft` (below) does that after mount.
   */
  const [seed] = useState(() =>
    buildSeed({
      channel,
      initialDraft,
      briefSourceName,
      briefSourceUrl,
      previousChannelDate,
    }),
  );

  const [title, setTitle] = useState(seed.title);
  const [body, setBody] = useState(seed.body);
  const [status, setStatus] = useState<ChannelDraftStatus>(initialStatus);

  // --- Motor.es' own CMS columns -------------------------------------------
  // `Título Listados` falls back to a copy of `Título` when the model has nothing
  // genuinely different to propose, which is Motor.es' documented behaviour. And
  // while it is that copy it keeps following the headline, exactly like the slug
  // does on step ④ — a copy that silently goes stale would be worse than no
  // prefill at all. The moment it is edited by hand, it stops following.
  const [listTitle, setListTitle] = useState(seed.listTitle);
  const [listTitleEdited, setListTitleEdited] = useState(seed.listTitleEdited);
  const [discoverTitle, setDiscoverTitle] = useState(seed.discoverTitle);
  const [metaTitle, setMetaTitle] = useState(seed.metaTitle);
  const [metaDescription, setMetaDescription] = useState(seed.metaDescription);
  const [lead, setLead] = useState(seed.lead);
  const [brand, setBrand] = useState(seed.brand);
  const [model, setModel] = useState(seed.model);
  // Prefilled from the idea's source when there is one, empty when writing from
  // scratch. We already know this from step ①.
  const [sourceName, setSourceName] = useState(seed.sourceName);
  const [sourceUrl, setSourceUrl] = useState(seed.sourceUrl);
  const [cmsTags, setCmsTags] = useState<string[]>(seed.cmsTags);
  // Our own record of what happened on Motor.es' site, not one of their CMS
  // columns — see `PublicationRecordFields`. Never validated, never blocking:
  // it is bookkeeping, filled in whenever Fer actually publishes over there.
  const [published, setPublished] = useState(seed.published);
  const [publishedDate, setPublishedDate] = useState(seed.publishedDate);
  const [publishedUrl, setPublishedUrl] = useState(seed.publishedUrl);

  /**
   * What each field held the last time it was copied.
   *
   * Storing the **value** and not a boolean is what makes the tick honest: a
   * field that has been edited since simply stops matching, so its "copiado"
   * disappears without any clearing logic, and comes back if you undo. A tick
   * beside a field that has changed would be a confident lie on the one screen
   * whose entire job is to be trustworthy about what you have already pasted.
   */
  const [copiedValues, setCopiedValues] = useState<Record<string, string>>({});

  // The `posts` record, only meaningful where we host the piece. Excerpt,
  // category and tags arrive proposed by the AI and editable (Fer, 2026-07-26):
  // they are all derivable from the text it just wrote, and a pre-filled record
  // is never a blank page.
  const [excerpt, setExcerpt] = useState(seed.excerpt);
  const [category, setCategory] = useState<PostCategory>(seed.category);
  const [tags, setTags] = useState<string[]>(seed.tags);
  // The alt text is written by the AI from the image itself, and rewritten
  // whenever the image changes — unless it has been edited by hand, in which case
  // the person's words win and the button is there to redo it on purpose.
  const [imageAlt, setImageAlt] = useState(seed.imageAlt);
  const [altEdited, setAltEdited] = useState(seed.altEdited);
  const [describingAlt, setDescribingAlt] = useState(false);
  const [slug, setSlug] = useState(seed.slug);
  const [slugEdited, setSlugEdited] = useState(seed.slugEdited);
  // "Qué ha cambiado esta semana" — EVminds only. Lives in state (and the
  // autosave) from the very first render, before the text even exists, so
  // typing it and leaving without pressing "Generar" does not lose it.
  const [weeklyNotes, setWeeklyNotes] = useState(seed.weeklyNotes);
  // Errors on these show on blur, like step ②: complaining about an empty field
  // on arrival would be scolding someone for not having typed yet.
  const [excerptTouched, setExcerptTouched] = useState(false);
  const [altTouched, setAltTouched] = useState(false);
  const [leadTouched, setLeadTouched] = useState(false);

  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [editPrompt, setEditPrompt] = useState("");
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [variants, setVariants] = useState<MockImageVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Whether this channel already has a text of its own. `true` only when
  // resumed with an actual title, `false` otherwise — computed once from the
  // seed, not derived from the live `title`, so clearing the field mid-edit
  // can never send the screen back to the generating state by accident.
  const [generated, setGenerated] = useState(Boolean(seed.title));
  // Motor.es starts generating immediately (the mount effect below fires the
  // instant this renders); EVminds starts idle and waits for its button.
  const [generatingDraft, setGeneratingDraft] = useState(channel === "motor" && !seed.title);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // "Volver a generar" on the body field alone (Fer, 2026-07-27) — a separate
  // flag from `generatingDraft`, which is reserved for the first, full-screen
  // generation. This one is scoped and small: a toast on success or failure,
  // never a screen takeover, and it never touches title/entradilla/tags/etc.
  const [regeneratingBody, setRegeneratingBody] = useState(false);

  const [improvingSeo, setImprovingSeo] = useState(false);
  const [writingMetaDescription, setWritingMetaDescription] = useState(false);
  const [shorteningTitle, setShorteningTitle] = useState(false);
  const [publishDate, setPublishDate] = useState(seed.publishDate);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [done, setDone] = useState(false);
  const { toast, showToast, dismiss } = useToast();

  /**
   * Everything this screen persists, in the shape the row expects.
   *
   * Only one of the two payloads applies, and it is chosen by the same flags that
   * decide which fields are on screen — so a channel can never store a field it
   * does not show.
   */
  const payload: ChannelPayload = spec.needsCmsFields
    ? {
        listTitle,
        discoverTitle,
        metaTitle,
        metaDescription,
        lead,
        brand,
        model,
        sourceName,
        sourceUrl,
        tags: cmsTags,
        published,
        publishedDate,
        publishedUrl,
      }
    : { slug, excerpt, category, tags, imageAlt, weeklyNotes };

  const { state: saveState, saveNow } = useDraftAutosave({
    pieceId,
    channel,
    draft: {
      title,
      body,
      imageUrl: imageUrl || null,
      publishDate: publishDate || null,
      payload,
      status,
    },
    // A resumed draft is already what the database holds; a freshly generated one
    // is not, so its first autosave is what materializes it.
    savedOnMount: Boolean(initialDraft),
    onError: () =>
      showToast("No se ha podido guardar. Se reintentará con el siguiente cambio.", "error"),
  });

  const errors = validateChannelDraft({
    title,
    body,
    imageUrl,
    publishDate,
    // Its presence is what turns on each channel's extra rules, rather than a
    // flag beside optional fields.
    postRecord: spec.needsPostRecord ? { slug, excerpt, imageAlt } : undefined,
    cmsRecord: spec.needsCmsFields ? { lead } : undefined,
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
  if (errors.lead) missing.push("escribe la entradilla");
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

  const busy =
    handingOff ||
    navigating ||
    editing ||
    generatingImage ||
    savingDraft ||
    generatingDraft ||
    regeneratingBody;

  /** Set only when there is another channel screen after this one. */
  const nextSpec = nextChannel ? getChannel(nextChannel) : null;
  /** The channel this screen follows, for naming where the prefilled date came from. */
  const previousChannel = channels[index - 1];
  const previousSpec = previousChannel ? getChannel(previousChannel) : null;

  /**
   * Where "Volver atrás" lands: the **previous channel's screen** when there is
   * one, and the piece's brief when this is the first channel.
   *
   * Both are plain paths now: the piece is in the URL, so there is nothing to
   * carry along and nothing that can fail to arrive.
   */
  const backHref = previousSpec ? channelUrl(pieceId, previousSpec.value) : pieceBriefUrl(pieceId);

  // --- Copying, field by field ---------------------------------------------

  function markCopied(field: string, value: string) {
    setCopiedValues((prev) => ({ ...prev, [field]: value }));
  }

  /** A plain field: what you see is what lands in their input. */
  function bindCopy(field: string, value: string): CopyBinding {
    return {
      copied: Boolean(value.trim()) && copiedValues[field] === value,
      onCopy: () => {
        copyPlain(value);
        markCopied(field, value);
      },
    };
  }

  /**
   * A rich field (the entradilla): copied as `text/html` so it arrives in their
   * WYSIWYG **formatted**. Copying the Markdown source as plain text would paste
   * literal asterisks into a box that has no source view.
   */
  function bindRichCopy(field: string, markdown: string): CopyBinding {
    return {
      copied: Boolean(markdown.trim()) && copiedValues[field] === markdown,
      onCopy: () => {
        copyRich(markdownToHtml(markdown), markdown);
        markCopied(field, markdown);
      },
    };
  }

  /** Chips joined the way their box reads them back. */
  const tagsValue = cmsTags.join(", ");

  /** How many of a block's filled-in fields have been copied. Empty ones don't count. */
  function progressOf(fields: [field: string, value: string][]) {
    const filled = fields.filter(([, value]) => value.trim());
    return {
      done: filled.filter(([field, value]) => copiedValues[field] === value).length,
      total: filled.length,
    };
  }

  const headlineFields: [string, string][] = [
    ["title", title],
    ["listTitle", listTitle],
    ["discoverTitle", discoverTitle],
  ];
  const searchFields: [string, string][] = [
    ["metaTitle", metaTitle],
    ["metaDescription", metaDescription],
  ];
  const textFields: [string, string][] = [
    ["lead", lead],
    ["body", body],
  ];
  const recordFields: [string, string][] = [
    ["brand", brand],
    ["model", model],
    ["sourceName", sourceName],
    ["sourceUrl", sourceUrl],
    ["tags", tagsValue],
  ];

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
   * alt is written in their CMS, not here.
   */
  useEffect(() => {
    if (!spec.needsPostRecord || !imageUrl || imageAlt || describingAlt) return;
    describeImage(imageUrl);
    // Empty deps on purpose: this is the arrival pass. Later image changes go
    // through `handleImageChange`, which is the only place that knows whether the
    // alt was written by hand and must be left alone.
  }, []);

  /**
   * Every headline change goes through here so what derives from it can follow:
   * the slug on EVminds, and `Título Listados` on Motor.es while it is still the
   * fallback copy. Including the change "Mejorar SEO" makes, which is the case a
   * plain `setTitle` would silently miss.
   */
  function applyTitle(next: string) {
    setTitle(next);
    if (!slugEdited) setSlug(slugify(next));
    if (!listTitleEdited) setListTitle(next);
  }

  /**
   * The one call to the redactor proxy, shared by every action that needs a
   * fresh draft: the initial generation and the per-field "Volver a generar".
   * Throws on any failure, so each caller decides how to surface it (a
   * full-screen error for the first generation, a toast for a scoped retry).
   */
  async function requestRedactor() {
    const res = await fetch("/admin/redaccion/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pieceId,
        channel,
        briefTitle,
        briefAngle,
        sourceName: briefSourceName ?? "",
        sourceUrl: briefSourceUrl ?? "",
        ...(channel === "evminds" ? { weeklyNotes } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok !== true) {
      throw new Error(typeof data?.error === "string" ? data.error : "La generación ha fallado.");
    }
    return data;
  }

  /**
   * The real redactor call, replacing the old canned `mockGenerateDraft`.
   *
   * Shared by both channels: the mount effect below fires it automatically for
   * Motor.es, and `handleGenerateEvminds` fires it from `EvmindsPreGenerateStep`'s
   * button. Everything the call needs — the brief, `weeklyNotes`, and the
   * sibling Motor.es draft when it is `published` (resolved server-side by the
   * proxy, never here) — is already in scope or in state by the time this runs.
   *
   * A real Gemini call cannot be synchronous like the old mock was, so both
   * channels now share the same generating/error state and the same wait
   * (`DraftGeneratingLoader`) instead of one being instant.
   */
  async function generateDraft() {
    setGeneratingDraft(true);
    setGenerateError(null);
    try {
      const data = await requestRedactor();

      applyTitle(data.title);
      setBody(data.body);
      // Goes through the same path as picking a new upload: it is what also
      // kicks off the alt-text description, which the mount-time effect could
      // not do since there was no image yet when it ran.
      handleImageChange(MOCK_HERO_IMAGE);

      if (channel === "motor") {
        setDiscoverTitle(data.discoverTitle ?? "");
        setMetaTitle(data.metaTitle ?? "");
        setMetaDescription(data.metaDescription ?? "");
        setLead(data.lead ?? "");
        setBrand(data.brand ?? "");
        setModel(data.model ?? "");
        setSourceName(data.sourceName ?? "");
        setSourceUrl(data.sourceUrl ?? "");
        setCmsTags(Array.isArray(data.tags) ? data.tags : []);
        // Empty means "nothing genuinely different" (Motor.es' own documented
        // fallback): `applyTitle` above already copied the headline into it
        // while `listTitleEdited` was still false. A distinct one overrides
        // that copy and stops it following the headline from here on.
        if (data.listTitle) {
          setListTitle(data.listTitle);
          setListTitleEdited(true);
        }
      } else {
        // Excerpt/category/tags: still `mockPostRecord`, not part of this pass.
        const record = mockPostRecord(data.title, data.body);
        setExcerpt(record.excerpt);
        setCategory(record.category);
        setTags(record.tags);
      }

      setGenerated(true);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "La generación ha fallado.");
    } finally {
      setGeneratingDraft(false);
    }
  }

  /**
   * "Volver a generar" on "Cuerpo noticia" alone (Fer, 2026-07-27). Runs the
   * same redactor call — there is no body-only prompt, so this is a fresh full
   * draft off the same brief — but only the body is applied. Título,
   * entradilla, tags, marca/modelo… stay exactly as they are, since the point
   * is another take on the body, not redoing the whole piece.
   */
  async function handleRegenerateBody() {
    setRegeneratingBody(true);
    try {
      const data = await requestRedactor();
      setBody(data.body);
      showToast("Nuevo cuerpo generado. El resto del borrador sigue igual.");
    } catch {
      showToast("No se ha podido volver a generar el cuerpo.", "error");
    } finally {
      setRegeneratingBody(false);
    }
  }

  /**
   * Motor.es fires the redactor call the instant this screen mounts with
   * nothing generated yet — it has no note to wait for, unlike EVminds, so
   * there is no gate to press through first.
   */
  useEffect(() => {
    if (channel === "motor" && !generated) void generateDraft();
    // Empty deps on purpose: this is the arrival pass, fired once. Retries go
    // through the button in the error state below, not through this effect.
  }, []);

  /** EVminds' own trigger, pressed from `EvmindsPreGenerateStep`. */
  function handleGenerateEvminds() {
    void generateDraft();
  }

  /** Last chance to fix the headline, in case step ② skipped the SEO pass. */
  async function handleImproveSeo() {
    setImprovingSeo(true);
    try {
      const res = await fetch("/admin/redaccion/improve-seo-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, maxLength: CMS_TITLE_MAX }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      applyTitle(data.title);
    } catch {
      showToast("No se ha podido mejorar el titular.", "error");
    } finally {
      setImprovingSeo(false);
    }
  }

  /**
   * Writes the meta description on demand (Fer, 2026-07-26).
   *
   * Built from the headline and NOT from the entradilla, which is the whole
   * point of the two being different asks: one sentence for a search result
   * versus a paragraph that opens the article.
   */
  async function handleWriteMetaDescription() {
    setWritingMetaDescription(true);
    try {
      const res = await fetch("/admin/redaccion/write-meta-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      setMetaDescription(data.metaDescription);
    } catch {
      showToast("No se ha podido escribir la meta descripción.", "error");
    } finally {
      setWritingMetaDescription(false);
    }
  }

  /** Shortens the headline into the meta title. Only offered when it overruns 65. */
  async function handleShortenTitle() {
    setShorteningTitle(true);
    try {
      const res = await fetch("/admin/redaccion/shorten-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error();
      setMetaTitle(data.metaTitle);
    } catch {
      showToast("No se ha podido acortar el titular.", "error");
    } finally {
      setShorteningTitle(false);
    }
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
   *
   * With the autosave running underneath, this button is no longer the only way
   * the work survives — it is the **commit point you can point at**. Both are
   * needed: automatic saving keeps the promise, and a button you pressed is what
   * makes it believable.
   */
  async function handleSaveDraft() {
    setSavingDraft(true);
    const ok = await saveNow();
    setSavingDraft(false);
    if (ok) showToast("Borrador guardado. Puedes seguir cuando quieras.");
  }

  /**
   * Picking a variation updates the big preview above, which is the whole point:
   * the thumbnails are small, and the decision is about the image that will
   * actually be published.
   *
   * PROTOTYPE: the real version swaps the URL for the generated one and this
   * filter disappears.
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
   * - **Not the last channel:** just moves on to the next one's screen.
   * - **The last channel:** finishes — schedules on EVminds, and on Motor.es
   *   closes the piece and keeps the backup copy. **It no longer copies
   *   anything** (Fer, 2026-07-26): with fourteen fields pasted one by one, a
   *   button that copied "the text" would be copying a part of the piece and
   *   calling it the whole, which is exactly the misunderstanding this screen
   *   exists to remove.
   *
   * Either way it is gated on the same validation, because "seguir" without a
   * finished piece would just push an incomplete draft one step further.
   */
  async function handlePrimary() {
    if (!isChannelDraftValid(errors)) return;

    if (nextSpec) {
      setNavigating(true);
      // Flushed rather than left to the timer: navigating away mid-debounce is
      // exactly the window that would lose the last edits — and it is also what
      // lets the next channel read this one's date from its row instead of being
      // handed it in the URL.
      await saveNow();
      window.location.href = channelUrl(pieceId, nextSpec.value);
      return;
    }

    setHandingOff(true);
    // Terminal state, and the two channels' are NOT the same thing: Motor.es is
    // finished on our side, EVminds is scheduled. Phase 4 is what turns the
    // second one into an actual `posts` row and fills `post_id`.
    const finalStatus: ChannelDraftStatus = spec.handoff === "copy" ? "done" : "scheduled";
    const ok = await saveNow({ status: finalStatus });
    setHandingOff(false);
    if (!ok) return;
    setStatus(finalStatus);
    setDone(true);
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

  const imageBlock = (
    <StepSection
      title="La imagen de cabecera"
      hint={
        spec.needsCmsFields
          ? "Obligatoria para publicar. En su CMS va aparte, en «Fotos relacionadas», así que aquí no sigue el orden del formulario."
          : "Obligatoria para publicar. Sube la tuya y, si quieres, deja que la IA la edite."
      }
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
  );

  const scheduleBlock = (
    <StepSection title="Cuándo se publica">
      <ScheduleField
        date={publishDate}
        onDateChange={setPublishDate}
        label={spec.dateLabel}
        // Where the prefilled date came from, said out loud: a date that appears
        // on its own with no explanation is the kind of automatic behaviour
        // people work around instead of trusting.
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
  );

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps steps={steps} current={3 + index} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackStepButton
          href={backHref}
          // `onBeforeLeave` decides: this flag only matters for callers without
          // one, which this screen no longer is.
          dirty={false}
          // **This dialog used to warn that going back lost the text, the image
          // and the date, and that was true: there was no durable row.** Now
          // there is, so leaving saves and goes — and the only thing left worth
          // interrupting for is a save that failed. Leaving the old wording in
          // place would have been worse than never having it: a dialog that
          // warns about something that cannot happen teaches people not to read
          // dialogs.
          confirmTitle="No se han podido guardar los cambios"
          confirmDescription={`Los últimos cambios de ${spec.name} no han llegado a guardarse, así que se perderían al salir. Puedes seguir aquí e intentarlo otra vez, o salir de todas formas.`}
          onBeforeLeave={() => saveNow()}
          disabled={busy}
        />
        {/* Same size and style as "Volver atrás" (Fer, 2026-07-27): a second way
            to reach the preview, always in reach at the top of the screen,
            alongside the one that lives next to "Cuerpo noticia" for when you
            want it without scrolling up while writing. Both open the same sheet. */}
        <Button
          variant="outline"
          size="lg"
          onClick={() => setPreviewOpen(true)}
          disabled={busy || Boolean(errors.image)}
          title={errors.image ? "Para previsualizar hace falta la imagen de cabecera." : undefined}
        >
          <Eye />
          Previsualizar
        </Button>
      </div>

      {!generated ? (
        generatingDraft ? (
          <DraftGeneratingLoader />
        ) : channel === "evminds" ? (
          <div className="grid gap-4">
            {generateError && <FieldError message={generateError} />}
            <EvmindsPreGenerateStep
              briefTitle={briefTitle}
              briefAngle={briefAngle}
              weeklyNotes={weeklyNotes}
              onWeeklyNotesChange={setWeeklyNotes}
              onGenerate={handleGenerateEvminds}
              generating={generatingDraft}
            />
          </div>
        ) : (
          // Motor.es has no gate screen to fall back to, so a failed
          // auto-fire needs its own retry.
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
            <p className="max-w-[52ch] text-sm text-destructive">{generateError}</p>
            <Button type="button" variant="outline" onClick={() => void generateDraft()}>
              <Wand2 />
              Reintentar
            </Button>
          </div>
        )
      ) : (
        <div className="grid gap-4">
          {spec.needsCmsFields ? (
            /* Motor.es' form, mirrored top to bottom.
             The order is theirs, not ours (Fer, 2026-07-26): if the piece is
             transcribed from top to bottom, an order that differs from the CMS's
             makes you jump around, which is the exact friction this screen exists
             to remove. It costs the wizard's text → image → when rhythm — the
             date lands in the middle, between the meta fields and the entradilla,
             because that is where their "Publicar" row sits — and that trade was
             made on purpose: the rhythm was my preference, not jumping is Fer's
             stated pain. */
            <>
              <StepSection
                title="Los titulares"
                hint="Los tres títulos de Motor.es, en el orden de su formulario."
                aside={<CopyProgress {...progressOf(headlineFields)} />}
              >
                <CmsHeadlineFields
                  title={title}
                  onTitleChange={applyTitle}
                  listTitle={listTitle}
                  onListTitleChange={(next) => {
                    setListTitle(next);
                    setListTitleEdited(true);
                  }}
                  discoverTitle={discoverTitle}
                  onDiscoverTitleChange={setDiscoverTitle}
                  copy={{
                    title: bindCopy("title", title),
                    listTitle: bindCopy("listTitle", listTitle),
                    discoverTitle: bindCopy("discoverTitle", discoverTitle),
                  }}
                  improvingSeo={improvingSeo}
                  onImproveSeo={handleImproveSeo}
                  titleError={errors.title}
                  disabled={busy}
                />
              </StepSection>

              <StepSection
                title="Cómo se ve en Google"
                hint="Los dos son opcionales y lo normal es dejarlos vacíos: solo se usan para cambiar lo que Google enseña."
                aside={<CopyProgress {...progressOf(searchFields)} />}
              >
                <CmsSearchFields
                  metaTitle={metaTitle}
                  onMetaTitleChange={setMetaTitle}
                  metaDescription={metaDescription}
                  onMetaDescriptionChange={setMetaDescription}
                  fallbackTitle={title}
                  copy={{
                    metaTitle: bindCopy("metaTitle", metaTitle),
                    metaDescription: bindCopy("metaDescription", metaDescription),
                  }}
                  writingMetaDescription={writingMetaDescription}
                  onWriteMetaDescription={handleWriteMetaDescription}
                  // Their own hint is the rule: the meta title is for when the
                  // headline overruns, so the helper only exists in that case.
                  shorteningTitle={shorteningTitle}
                  onShortenTitle={title.length > CMS_TITLE_MAX ? handleShortenTitle : undefined}
                  disabled={busy}
                />
              </StepSection>

              {scheduleBlock}

              <StepSection
                title={`El texto para ${spec.name}`}
                hint={spec.draftHint}
                aside={<CopyProgress {...progressOf(textFields)} />}
              >
                <div className="grid gap-5">
                  <LeadField
                    value={lead}
                    onChange={(next) => {
                      setLead(next);
                      setLeadTouched(true);
                    }}
                    {...bindRichCopy("lead", lead)}
                    error={leadTouched ? errors.lead : null}
                    disabled={busy}
                  />
                  <DraftBodyField
                    label="Cuerpo noticia"
                    value={body}
                    onChange={setBody}
                    copied={Boolean(body.trim()) && copiedValues.body === body}
                    onCopy={(text) => {
                      copyPlain(text);
                      markCopied("body", body);
                    }}
                    onPreview={() => setPreviewOpen(true)}
                    // Previewing without the hero image would be showing a piece
                    // that cannot be published, and hiding the reason why.
                    previewBlockedReason={
                      errors.image ? "Para previsualizar hace falta la imagen de cabecera." : null
                    }
                    onRegenerate={handleRegenerateBody}
                    regenerating={regeneratingBody}
                    disabled={busy}
                  />
                  <FieldError message={errors.body} />
                </div>
              </StepSection>

              <StepSection
                title="Marca, fuente y tags"
                hint="El final de su formulario. La marca y el modelo allí son desplegables: esto te dice cuáles buscar."
                aside={<CopyProgress {...progressOf(recordFields)} />}
              >
                <CmsRecordFields
                  brand={brand}
                  onBrandChange={setBrand}
                  model={model}
                  onModelChange={setModel}
                  sourceName={sourceName}
                  onSourceNameChange={setSourceName}
                  sourceUrl={sourceUrl}
                  onSourceUrlChange={setSourceUrl}
                  tags={cmsTags}
                  onTagsChange={setCmsTags}
                  copy={{
                    brand: bindCopy("brand", brand),
                    model: bindCopy("model", model),
                    sourceName: bindCopy("sourceName", sourceName),
                    sourceUrl: bindCopy("sourceUrl", sourceUrl),
                    tags: bindCopy("tags", tagsValue),
                  }}
                  disabled={busy}
                />
              </StepSection>

              {/* Last, and that is deliberate: over there the image lives in the
                right-hand column ("Fotos relacionadas"), so it is a separate job
                rather than a step in the top-to-bottom pass. Putting it in the
                middle would interrupt the mirrored spine for something you will
                never be looking for in sequence. */}
              {imageBlock}

              {/* Ours, not theirs — so it sits after the mirrored spine rather than
                inside it. Often filled on a later visit, once Fer has actually
                pasted the piece into their CMS (Fer, 2026-07-27). */}
              <StepSection
                title="Registro de publicación"
                hint="Para llevar la cuenta de lo que de verdad ha salido en Motor.es."
              >
                <PublicationRecordFields
                  published={published}
                  onPublishedChange={setPublished}
                  publishedDate={publishedDate}
                  onPublishedDateChange={setPublishedDate}
                  publishedUrl={publishedUrl}
                  onPublishedUrlChange={setPublishedUrl}
                  disabled={busy}
                />
              </StepSection>
            </>
          ) : (
            <>
              <StepSection title={`El texto para ${spec.name}`} hint={spec.draftHint}>
                <DraftTextBlock
                  title={title}
                  body={body}
                  onTitleChange={applyTitle}
                  onBodyChange={setBody}
                  onPreview={() => setPreviewOpen(true)}
                  previewBlockedReason={
                    errors.image ? "Para previsualizar hace falta la imagen de cabecera." : null
                  }
                  improvingSeo={improvingSeo}
                  onImproveSeo={handleImproveSeo}
                  disabled={busy}
                />
                <FieldError message={errors.title ?? errors.body} />
              </StepSection>

              {imageBlock}

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

              {scheduleBlock}
            </>
          )}

          {/* What this button does changes with position in the chosen channels,
            not with the channel itself: mid-wizard it only advances (Fer,
            2026-07-25), and only the last screen actually finishes. */}
          <StepActions
            label={nextSpec ? `Seguir con ${nextSpec.name}` : spec.finalLabel}
            runningLabel={nextSpec ? "Cargando…" : spec.finalRunningLabel}
            running={nextSpec ? navigating : handingOff}
            onClick={handlePrimary}
            icon={nextSpec ? undefined : spec.handoff === "copy" ? <Check /> : <CalendarClock />}
            trailingIcon={nextSpec ? <ArrowRight data-icon="inline-end" /> : undefined}
            missing={missing}
            missingPrefix={nextSpec ? "Antes de seguir" : "Antes de terminar"}
            readyHint={
              nextSpec
                ? `El texto y la imagen de ${spec.name} se quedan como están; podrás volver a retocarlos después.`
                : spec.handoff === "copy"
                  ? "Se guarda la copia de respaldo y la pieza queda terminada por nuestro lado. Publicarla es meterla en su CMS."
                  : "Quedará programado y podrás cambiar la fecha después desde Artículos."
            }
            minWidth="16rem"
            secondary={{
              label: "Guardar borrador",
              runningLabel: "Guardando…",
              running: savingDraft || saveState === "saving",
              onClick: handleSaveDraft,
              // Nothing pending: the button says so and goes inert, which is also
              // how the autosave becomes visible without a second widget saying the
              // same thing in different words.
              done: saveState === "clean",
              doneLabel: "Borrador guardado",
              minWidth: "13rem",
            }}
          />
        </div>
      )}

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
