import type { PublishChannel } from "./editorial-types";
import type { ReviewSession } from "@/components/admin/editorial/ArticleReviewPanel";

/**
 * The Revisor AI's last report per piece+channel, kept in `localStorage` so
 * it survives a page reload (Fer, 2026-08-04) — never in the database, it is
 * advice about the text at some past instant, not part of the draft itself.
 * Scoped to `pieceId` + `channel` so Motor.es and EVminds, or two different
 * pieces, never read each other's cached report.
 */
function storageKey(pieceId: string, channel: PublishChannel): string {
  return `evminds-review-${pieceId}-${channel}`;
}

export function readReviewSession(pieceId: string, channel: PublishChannel): ReviewSession | null {
  try {
    const raw = localStorage.getItem(storageKey(pieceId, channel));
    return raw ? (JSON.parse(raw) as ReviewSession) : null;
  } catch {
    return null;
  }
}

export function writeReviewSession(
  pieceId: string,
  channel: PublishChannel,
  session: ReviewSession,
): void {
  try {
    localStorage.setItem(storageKey(pieceId, channel), JSON.stringify(session));
  } catch {
    // Storage full or unavailable (private browsing): the report still works
    // for this page load, it just won't survive a reload. Not worth surfacing.
  }
}

export function clearReviewSession(pieceId: string, channel: PublishChannel): void {
  try {
    localStorage.removeItem(storageKey(pieceId, channel));
  } catch {
    // Same as above: nothing to react to.
  }
}
