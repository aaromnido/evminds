import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** One plain line saying what this block is for, in plain language. */
  hint?: string;
  /** Optional badge or counter aligned to the right of the title. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A titled block inside a wizard step, framed like an idea card so the panel
 * keeps one shell shape (`rounded-xl border bg-card`).
 *
 * Each block answers one question — what you want to say, what to read first,
 * where it goes — because a wizard step made of loose fields reads as a form to
 * fill in, while blocks read as decisions to make.
 */
export default function StepSection({ title, hint, aside, children, className }: Props) {
  return (
    <section className={cn("grid gap-4 rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="grid gap-1">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint && <p className="max-w-[68ch] text-xs text-muted-foreground">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
