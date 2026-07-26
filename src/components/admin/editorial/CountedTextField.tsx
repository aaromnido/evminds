import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AiAssistButton from "./AiAssistButton";
import FieldCounter, { type CounterUnit } from "./FieldCounter";
import FieldShell from "./FieldShell";

interface Props {
  id: string;
  label: string;
  hint: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  /**
   * The recommended length. Absent means no counter at all — `Título Discover`
   * has no number in Motor.es' CMS, and inventing one would be presenting our
   * guess as their rule.
   */
  max?: number;
  unit?: CounterUnit;
  /** Hover text for the counter, in and over the limit. */
  counterTitle?: string;
  counterOverTitle?: string;
  /** More than one line. Absent renders a single-line `Input`. */
  rows?: number;
  /** Absent hides the copy button: not every field is transcribed anywhere. */
  copy?: {
    what: string;
    copied: boolean;
    onCopy: () => void;
  };
  /** Absent hides the AI button: only some fields have something to improve. */
  assist?: {
    label: string;
    runningLabel: string;
    running: boolean;
    onClick: () => void;
    minWidth?: string;
  };
  error?: string | null;
  disabled?: boolean;
}

/**
 * A labelled text field with a length target, an optional copy button and an
 * optional AI helper.
 *
 * **This is the old `SeoTitleField`, generalized rather than forked.** It was
 * built for one headline with one hardcoded limit of 60, and step ③ now needs the
 * same control four more times with different numbers, some of them without the
 * "Mejorar SEO" button and all of them with a copy button. Two near-identical
 * headline fields would have drifted the first time the amber pill was adjusted;
 * the rename is because "SeoTitle" stopped describing four of its five uses.
 *
 * Everything variable is a prop, and **every prop that varies is optional**, so
 * the absence of one is how a caller says the feature does not apply here (no
 * `assist` → no AI button, no `max` → no counter). That reads better than a row
 * of booleans, because the missing handler *is* the reason.
 */
export default function CountedTextField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  onBlur,
  required,
  max,
  unit,
  counterTitle,
  counterOverTitle,
  rows,
  copy,
  assist,
  error,
  disabled,
}: Props) {
  const control = rows ? (
    <Textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      placeholder={placeholder}
    />
  ) : (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      placeholder={placeholder}
      className="min-w-[16rem] flex-1"
    />
  );

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      required={required}
      copy={copy && { ...copy, disabled: disabled || !value.trim() }}
      counter={
        max === undefined ? undefined : (
          <FieldCounter
            value={value}
            max={max}
            unit={unit}
            title={counterTitle}
            overTitle={counterOverTitle}
          />
        )
      }
      error={error}
    >
      {assist ? (
        <div className="flex flex-wrap items-center gap-2">
          {control}
          <AiAssistButton
            label={assist.label}
            runningLabel={assist.runningLabel}
            running={assist.running}
            disabled={disabled || value.trim().length === 0}
            onClick={assist.onClick}
            minWidth={assist.minWidth ?? "8.75rem"}
            buttonClassName="h-8"
          />
        </div>
      ) : (
        control
      )}
    </FieldShell>
  );
}
