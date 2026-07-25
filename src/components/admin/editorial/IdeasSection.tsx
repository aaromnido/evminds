import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** Short line explaining what this group of ideas is, in plain language. */
  hint?: string;
  count: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * A titled group of idea cards. Ideas are split into "today's proposals"
 * (transient, not stored) and "saved and own" (persisted), and the split has to
 * be legible at a glance — it is what makes "guardar para otra ocasión" feel like
 * it did something.
 */
export default function IdeasSection({ title, hint, count, children, className }: Props) {
  if (count === 0) return null;

  return (
    <section className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">{count}</span>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
