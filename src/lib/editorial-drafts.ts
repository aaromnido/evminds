/**
 * The seam between a wizard screen and its durable row (task A3, phase 2).
 *
 * Everything channel-specific lives in `editorial_channel_drafts.payload`, a
 * `jsonb` column, which buys the schema freedom the Motor.es/EVminds asymmetry
 * needs and costs exactly one thing: **the database will hand back whatever was
 * written there, including something an older version of this app wrote.** So the
 * parsers below are deliberately tolerant — unknown keys are dropped, missing
 * ones become empty, and a wrong type falls back rather than throwing. A screen
 * that refuses to open is a worse failure than a field that arrives blank, since
 * the blank field is visible and fixable and the crash loses the whole piece.
 *
 * These functions are pure on purpose: they are the place where a rename or a
 * typo silently drops someone's text, so they are the part of this phase that is
 * worth testing.
 */

import { isValidPostCategory, VALID_POST_CATEGORIES, type PostCategory } from "./post-categories";
import type { PublishChannel } from "./editorial-types";

/** Motor.es' own CMS columns. Their labels and rules live in the UI; this is storage. */
export interface MotorChannelPayload {
  /** Empty means "no distinct listing title": the UI falls back to a copy of the headline. */
  listTitle: string;
  discoverTitle: string;
  /** Both metas are the escape valve for a long headline, so empty IS the normal value. */
  metaTitle: string;
  metaDescription: string;
  /** Markdown, like the body. The body must NOT repeat it. */
  lead: string;
  brand: string;
  model: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  /**
   * Our own record of what actually happened on Motor.es' site — not one of
   * their CMS columns, so it sits apart from the fields above. Fer asked for it
   * (2026-07-27) to keep the real publish date and the live link, and it doubles
   * as the redactor's signal for whether there is a genuinely published text for
   * EVminds to adapt, rather than guessing from this draft's own `done` status.
   */
  published: boolean;
  /** `YYYY-MM-DD`, empty until set. The real date, distinct from `publishDate` above (the expected day). */
  publishedDate: string;
  publishedUrl: string;
}

/** What a `posts` row needs and someone else's CMS does not. */
export interface EvmindsChannelPayload {
  slug: string;
  excerpt: string;
  category: PostCategory;
  tags: string[];
  imageAlt: string;
  /**
   * What Fer typed under "Qué ha cambiado esta semana" (Fer, 2026-07-27):
   * reader comments, a confirmed or denied figure, a new number — the material
   * that only exists because EVminds is written a week after Motor.es. Optional,
   * never validated, read by the redactor call when generating this channel's
   * text.
   */
  weeklyNotes: string;
}

export type ChannelPayload = MotorChannelPayload | EvmindsChannelPayload;

/**
 * Lifecycle of one channel. Both terminal values are closed and they do NOT mean
 * the same thing (see migration 53): `done` is Motor.es finished on our side —
 * publishing it is typing it into their CMS — and `scheduled` means a `posts` row
 * exists. Mirrored in `database.types.ts`.
 */
export type ChannelDraftStatus = "draft" | "done" | "scheduled";

/** Reads a string field out of raw jsonb, whatever it turns out to be. */
function str(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

/** Reads a boolean field out of raw jsonb. Anything else defaults to `false`. */
function bool(source: Record<string, unknown>, key: string): boolean {
  return source[key] === true;
}

/**
 * Reads a string array. Anything that is not an array of strings becomes empty
 * rather than being coerced: a tag list is the kind of field where inventing
 * `["[object Object]"]` would be worse than showing none.
 */
function strArray(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export function parseMotorPayload(raw: unknown): MotorChannelPayload {
  const source = asRecord(raw);
  return {
    listTitle: str(source, "listTitle"),
    discoverTitle: str(source, "discoverTitle"),
    metaTitle: str(source, "metaTitle"),
    metaDescription: str(source, "metaDescription"),
    lead: str(source, "lead"),
    brand: str(source, "brand"),
    model: str(source, "model"),
    sourceName: str(source, "sourceName"),
    sourceUrl: str(source, "sourceUrl"),
    tags: strArray(source, "tags"),
    published: bool(source, "published"),
    publishedDate: str(source, "publishedDate"),
    publishedUrl: str(source, "publishedUrl"),
  };
}

export function parseEvmindsPayload(raw: unknown): EvmindsChannelPayload {
  const source = asRecord(raw);
  const category = str(source, "category");
  return {
    slug: str(source, "slug"),
    excerpt: str(source, "excerpt"),
    // `posts.category` is a closed set of OURS (post-categories.ts), so an
    // unrecognized value is corrected instead of carried: it would only fail
    // later, at the insert, with nothing on screen explaining why.
    category: isValidPostCategory(category) ? category : VALID_POST_CATEGORIES[0],
    tags: strArray(source, "tags"),
    imageAlt: str(source, "imageAlt"),
    weeklyNotes: str(source, "weeklyNotes"),
  };
}

/** Parses a stored payload for whichever channel the row belongs to. */
export function parseChannelPayload(channel: PublishChannel, raw: unknown): ChannelPayload {
  return channel === "motor" ? parseMotorPayload(raw) : parseEvmindsPayload(raw);
}

/** What a channel starts from when its row does not exist yet. */
export function blankPayload(channel: PublishChannel): ChannelPayload {
  return parseChannelPayload(channel, {});
}

/**
 * The whole persisted state of one channel screen: the shared columns plus its
 * payload. This is what the screen saves and what it is restored from, so the two
 * directions cannot drift apart into separate lists of fields.
 */
export interface ChannelDraftState {
  title: string;
  /** Markdown. */
  body: string;
  imageUrl: string | null;
  /** `YYYY-MM-DD`, or null while the day has not been chosen. */
  publishDate: string | null;
  payload: ChannelPayload;
}

/** Row shape as it comes back from Supabase, narrowed to what this seam reads. */
interface ChannelDraftRow {
  channel: PublishChannel;
  title: string;
  body: string;
  image_url: string | null;
  publish_date: string | null;
  payload: Record<string, unknown> | null;
}

export function channelDraftFromRow(row: ChannelDraftRow): ChannelDraftState {
  return {
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    // A half-typed date never reaches here (the input only emits complete ones),
    // but an empty string would be stored as a date-shaped nothing, so it is
    // normalized to null in both directions.
    publishDate: row.publish_date || null,
    payload: parseChannelPayload(row.channel, row.payload),
  };
}

/**
 * The other direction: what an autosave writes. Mirrors `channelDraftFromRow`
 * field for field.
 *
 * Reading tolerates a null payload (an old row, or one written by hand) and
 * writing never produces one, which is why the two shapes are not the same type.
 */
export function channelDraftToRow(state: ChannelDraftState): {
  title: string;
  body: string;
  image_url: string | null;
  publish_date: string | null;
  payload: Record<string, unknown>;
} {
  return {
    title: state.title,
    body: state.body,
    image_url: state.imageUrl || null,
    publish_date: state.publishDate || null,
    payload: { ...state.payload },
  };
}
