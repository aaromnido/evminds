import { cn } from "@/lib/utils";

export type DraftView = "markdown" | "html";

// HTML first because it is the default view: the leftmost slot is where the eye
// starts, and the order should match which one you land on (Fer, 2026-07-25).
const VIEWS: { value: DraftView; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "markdown", label: "Markdown" },
];

interface Props {
  value: DraftView;
  onChange: (view: DraftView) => void;
}

/**
 * Which form of the text you are looking at.
 *
 * Two views of the same content, not two documents: **Markdown is the one you
 * edit and the only one stored**, and the HTML side shows it rendered, as it
 * will read. It is read-only — letting both be edited would mean converting
 * back, and a round trip through two formats loses something every time.
 *
 * The markup itself is never put on screen (it was, briefly, and Fer was right
 * that nobody wants to read tags): it travels through the copy button, which is
 * the only place it is actually useful.
 */
export default function DraftViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Formato del texto"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {VIEWS.map((view) => {
        const active = view.value === value;
        return (
          <button
            key={view.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(view.value)}
            className={cn(
              "cursor-pointer rounded-[min(var(--radius-md),12px)] px-3 py-1 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
