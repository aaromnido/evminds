import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** Short line explaining what this group is, in plain language. */
  hint?: string;
  count: number;
  /** Optional link or control on the right of the header, e.g. "ver todas". */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A titled group of cards, with its count.
 *
 * Born for the two idea groups of step ① — "today's proposals" (transient) and
 * "saved and own" (persisted), a split that has to be legible at a glance or
 * "guardar para otra ocasión" stops feeling like it did anything — and now shared
 * with the pieces list, which needs exactly the same header. Renamed from
 * `IdeasSection` when that happened: keeping the old name would have made it lie
 * in half of its uses.
 */
export default function CardsSection({ title, hint, count, action, children, className }: Props) {
  if (count === 0) return null;

  return (
    <section className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">{count}</span>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {action && <div className="ms-auto">{action}</div>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
