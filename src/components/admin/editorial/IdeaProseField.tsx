import { cn } from "@/lib/utils";

interface Props {
  /** Small uppercase label, e.g. "ÁNGULO". */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A labelled block of prose inside an idea card. Extracted because the same
 * pairing (tiny label + readable paragraph) is reused for "ángulo" and "por qué
 * ahora" here, and again in step 2 when the angle becomes editable.
 */
export default function IdeaProseField({ label, children, className }: Props) {
  return (
    <div className={cn("grid gap-1", className)}>
      <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="text-sm leading-relaxed text-foreground/85">{children}</p>
    </div>
  );
}
