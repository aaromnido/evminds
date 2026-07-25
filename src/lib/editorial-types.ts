/**
 * Domain types for the AI editorial agent (task A3).
 *
 * These mirror the `editorial_candidates` and `external_collaboration_drafts`
 * tables described in `.claude/plans/plan-ai-editorial-agent-mvp.md`. The tables
 * do NOT exist yet: the admin UI is being built first against mock data
 * (`editorial-mocks.ts`), so these types are the contract the future migration
 * has to honour, not a reflection of the current schema.
 */

/**
 * Lifecycle of an idea.
 *
 * IMPORTANT (Fer, 2026-07-25): only `picked` and `saved` ideas — plus every idea
 * Fer writes himself — are meant to be **persisted**. A curator proposal that is
 * discarded, ignored or regenerated away never reaches the database. `pending`
 * is therefore a transient, in-memory state for a freshly generated batch.
 */
export type IdeaStatus = "pending" | "picked" | "saved" | "rejected" | "expired";

/** Where an idea came from. Own ideas have no source article to ground on. */
export type IdeaOrigin = "curator" | "own";

/** A topic proposal, either curator-generated or written by Fer. */
export interface IdeaCandidate {
  id: string;
  origin: IdeaOrigin;
  /** Original foreign article. Null for `origin: "own"`. */
  source_url: string | null;
  source_title: string | null;
  source_name: string | null;
  source_excerpt: string | null;
  /** Spanish headline the idea would carry. */
  proposed_title_es: string;
  /** The editorial take: what this piece would actually argue. */
  angle: string;
  /** Why this is worth writing right now. */
  rationale: string;
  /** Extra links to document the piece with (requirement R1). */
  reference_urls: string[];
  status: IdeaStatus;
  fetched_at: string;
  picked_at: string | null;
  /** 48 h after `fetched_at`. Only meaningful while `pending`. */
  expires_at: string;
}

/** What the "create an idea" form collects before an idea exists. */
export interface IdeaDraftInput {
  proposed_title_es: string;
  angle: string;
  rationale: string;
  /** One URL per line as typed; split on save. */
  reference_urls: string;
}

/**
 * Client-side only: how far along the "generate a draft" action is. Not
 * persisted — in the real build it is derived from whether an
 * `external_collaboration_drafts` row exists yet.
 */
export type DraftProgress = "idle" | "generating" | "ready";

/**
 * Where a piece ends up. Chosen per topic in step ②, not fixed by a rule, and it
 * is what decides whether the wizard has three steps or four.
 *
 * `evminds` is post-MVP (see the roadmap in the plan); it is selectable in the
 * prototype so the four-step flow can be designed before the backend exists.
 */
export type PublishChannel = "motor" | "evminds";

/**
 * Reading state of one documentation link (requirement R1).
 *
 * The link is fetched **when it is added**, not when the draft is generated: the
 * point of showing a per-link state is knowing what actually made it into the
 * prompt *while there is still time to react*. A status that only resolves at
 * generation time would be a report, not a decision aid.
 */
export type ReferenceLinkStatus = "reading" | "read" | "failed";

export interface ReferenceLink {
  id: string;
  url: string;
  status: ReferenceLinkStatus;
  /** Title of the fetched page — the proof that the right thing was read. */
  title: string | null;
  /** Plain-language reason it could not be read, shown next to a retry. */
  error: string | null;
}

/**
 * Everything step ② collects before the redactor runs. Mirrors the future
 * `external_collaboration_drafts` input; the links are stored as URLs, their
 * reading state is transient.
 */
export interface AngleBrief {
  proposed_title_es: string;
  angle: string;
  links: ReferenceLink[];
  channels: PublishChannel[];
}
