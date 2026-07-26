import { Label } from "@/components/ui/label";
import CopyFieldButton from "./CopyFieldButton";
import FieldError from "./FieldError";
import RequiredMark from "./RequiredMark";

interface Props {
  /** Ties the label to the control. The error gets `${id}-error`. */
  id: string;
  /** **The CMS's own wording**, verbatim, wherever the field mirrors one. */
  label: string;
  /**
   * One line saying what the field is FOR.
   *
   * This is the actual deliverable of step ③, not decoration: what hurts when
   * filling in someone else's CMS is remembering what `Título Listados` is versus
   * `Título Discover`, not the typing. Several of these lines are lifted word for
   * word from Motor.es' own help text.
   */
  hint: string;
  required?: boolean;
  /** Absent means there is nothing to copy here (a date, an upload). */
  copy?: {
    /** Named for the screen reader: "el titular", "la entradilla". */
    what: string;
    copied: boolean;
    onCopy: () => void;
    disabled?: boolean;
  };
  /** The `n/max` pill, right of the hint. */
  counter?: React.ReactNode;
  error?: string | null;
  /** The control itself, plus whatever sits beside it (an AI button). */
  children: React.ReactNode;
}

/**
 * The chrome every field on this section wears: label, copy button, control,
 * hint, counter, error — always in the same places.
 *
 * Extracted rather than repeated fourteen times, and the uniformity is the point
 * rather than a side effect. Because the copy button always sits at the right of
 * the label row, the finished screen has a **single column of copy buttons down
 * its right edge**, so "which ones have I already pasted?" is answered by
 * scanning one column instead of reading every field.
 */
export default function FieldShell({
  id,
  label,
  hint,
  required,
  copy,
  counter,
  error,
  children,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Label htmlFor={id}>
          {label}
          {required && <RequiredMark />}
        </Label>
        {copy && (
          <CopyFieldButton
            what={copy.what}
            copied={copy.copied}
            onCopy={copy.onCopy}
            disabled={copy.disabled}
          />
        )}
      </div>

      {children}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="max-w-[78ch] text-xs text-muted-foreground">{hint}</p>
        {counter}
      </div>

      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
