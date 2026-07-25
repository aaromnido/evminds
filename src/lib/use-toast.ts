import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "info" | "error";

/** Optional single action offered inside the toast, e.g. undoing what just happened. */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  /** Changes on every call so re-triggering replays the entry animation. */
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

/**
 * Minimal single-slot toast state: a new toast replaces the current one and
 * auto-dismisses. Deliberately not a queue — stacking notifications is noise in
 * an admin panel where actions are one at a time.
 */
export function useToast(durationMs = 5000) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | null>(null);
  const nextId = useRef(0);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success", action?: ToastAction) => {
      clearTimer();
      nextId.current += 1;
      setToast({ id: nextId.current, message, variant, action });
      timer.current = window.setTimeout(() => setToast(null), durationMs);
    },
    [clearTimer, durationMs],
  );

  // Don't leave a timer running after the island unmounts.
  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast, dismiss };
}
