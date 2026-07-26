import { useCallback, useEffect, useRef, useState } from "react";
import { type ChannelDraftState, type ChannelDraftStatus } from "./editorial-drafts";
import type { PublishChannel } from "./editorial-types";

/**
 * Autosave for a channel screen (task A3, phase 2).
 *
 * Timing and state live here, the way `use-toast.ts` owns its timers: the button
 * that shows this can be redesigned without touching when a save happens.
 *
 * **Why autosave at all.** The whole point of this phase is that closing the tab
 * mid-piece does not lose the work, and a save that only happens when you
 * remember to press a button is exactly the one you do not press when you are
 * interrupted — which is the only moment it matters.
 *
 * **Why debounced and not per keystroke.** The visual editor emits on every key,
 * the body is a few kB, and the target is the production database. Writing on
 * each keystroke would be dozens of writes per sentence for no perceptible gain;
 * two seconds after the last one feels identical and is two orders of magnitude
 * fewer. `saveNow()` covers the moments that must not wait (finishing a step,
 * navigating to the next channel).
 */

/** What gets persisted, plus the lifecycle state of the channel. */
export type PersistedDraft = ChannelDraftState & { status: ChannelDraftStatus };

/** What the UI shows. `dirty` means there are changes not written yet. */
export type AutosaveState = "clean" | "dirty" | "saving";

const DEFAULT_DELAY_MS = 2000;

interface Options {
  /** The piece this draft belongs to. Without it there is nothing to save into. */
  pieceId: string | null;
  channel: PublishChannel;
  draft: PersistedDraft;
  /**
   * Whether what is on screen is already what the database holds. False after a
   * fresh generation, so the very first autosave materializes the draft rather
   * than waiting for a change nobody may make.
   */
  savedOnMount: boolean;
  /** Called when a save fails, so the screen can say so in its own words. */
  onError?: () => void;
  delayMs?: number;
}

export function useDraftAutosave({
  pieceId,
  channel,
  draft,
  savedOnMount,
  onError,
  delayMs = DEFAULT_DELAY_MS,
}: Options): {
  state: AutosaveState;
  saveNow: (override?: Partial<PersistedDraft>) => Promise<boolean>;
} {
  const serialized = JSON.stringify(draft);

  // The timer fires later, so it must read the newest draft, not the one that
  // was current when it was scheduled.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const [lastSaved, setLastSaved] = useState<string | null>(savedOnMount ? serialized : null);
  const [saving, setSaving] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const save = useCallback(
    async (override?: Partial<PersistedDraft>): Promise<boolean> => {
      if (!pieceId) return false;
      const next = { ...draftRef.current, ...override };
      const snapshot = JSON.stringify(next);

      setSaving(true);
      try {
        const res = await fetch("/admin/redaccion/save-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pieceId, channel, ...next }),
        });
        if (!res.ok) throw new Error(`save-draft responded ${res.status}`);
        setLastSaved(snapshot);
        return true;
      } catch (err) {
        console.error("autosave failed:", err);
        onErrorRef.current?.();
        return false;
      } finally {
        setSaving(false);
      }
    },
    [pieceId, channel],
  );

  useEffect(() => {
    if (!pieceId || saving || serialized === lastSaved) return;
    const timer = window.setTimeout(() => void save(), delayMs);
    // Every keystroke replaces the pending save instead of queueing another one.
    return () => window.clearTimeout(timer);
  }, [pieceId, saving, serialized, lastSaved, save, delayMs]);

  return {
    state: saving ? "saving" : serialized === lastSaved ? "clean" : "dirty",
    saveNow: save,
  };
}
