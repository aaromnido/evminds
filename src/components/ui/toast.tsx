import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToastMessage } from "@/lib/use-toast";

/**
 * Colors come from the tone CSS vars the admin already defines, mixed with
 * `--background` for the fill and toward `--foreground` for the text, so the
 * same expression keeps its contrast in light and dark mode.
 */
const TONE = {
  success: "--ev-tone-green",
  /** Brand blue: a neutral "this happened", no alarm implied. */
  info: "--ev-primary-blue",
  error: "--ev-tone-red",
} as const;

const ICON = {
  success: CircleCheck,
  info: Info,
  error: CircleAlert,
} as const;

interface Props {
  toast: ToastMessage | null;
  onDismiss: () => void;
  className?: string;
}

/**
 * Bottom-right confirmation toast. Pair it with `useToast` (`src/lib/use-toast.ts`),
 * which owns the timing; this component only renders what it is given.
 */
export default function Toast({ toast, onDismiss, className }: Props) {
  if (!toast) return null;

  const tone = TONE[toast.variant];
  const Icon = ICON[toast.variant];

  return (
    <div
      // `key` restarts the entry animation when a new toast replaces this one.
      key={toast.id}
      role="status"
      aria-live="polite"
      className={cn(
        "fixed right-4 bottom-4 z-100 flex max-w-[min(24rem,calc(100vw-2rem))] items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, var(${tone}) 14%, var(--background))`,
        borderColor: `color-mix(in oklab, var(${tone}) 40%, var(--background))`,
        color: `color-mix(in oklab, var(${tone}) 40%, var(--foreground))`,
      }}
    >
      <Icon className="mt-px size-4 shrink-0" style={{ color: `var(${tone})` }} />
      <div className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className="cursor-pointer font-semibold underline underline-offset-4 hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
        className="-mr-1 -mt-0.5 cursor-pointer rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
