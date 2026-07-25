import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AiAssistButton from "./AiAssistButton";
import FieldError from "./FieldError";
import { SEO_TITLE_MAX } from "@/lib/editorial-mocks";

interface Props {
  id: string;
  label: string;
  /** Line under the field. The counter sits opposite it. */
  hint: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  improving: boolean;
  onImprove: () => void;
  error?: string | null;
  disabled?: boolean;
}

/**
 * A headline with its "Mejorar SEO" button and its length counter.
 *
 * Shared by step ② (the starting headline) and step ③ (the final one), because
 * the second is the last chance to fix what the first may have skipped — Fer's
 * point when he asked for it here too, and it is right: nothing forces you
 * through the SEO pass earlier, so the step that actually publishes has to offer
 * it as well.
 *
 * The counter is what makes the button checkable rather than an act of faith:
 * Google cuts the headline around 60 characters. Going over is a **warning, not
 * an error** — a long headline is worse SEO, not an invalid piece — so it turns
 * into an amber pill and blocks nothing. Amber *text* was tried and reads as
 * dark brown once mixed toward `--foreground` for contrast; the pill is how this
 * panel already solves that, in the expiry labels of step ①.
 */
export default function SeoTitleField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  onBlur,
  improving,
  onImprove,
  error,
  disabled,
}: Props) {
  const length = value.trim().length;
  const tooLong = length > SEO_TITLE_MAX;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          className="min-w-[16rem] flex-1"
        />
        <AiAssistButton
          label="Mejorar SEO"
          runningLabel="Mejorando…"
          running={improving}
          disabled={disabled || length === 0}
          onClick={onImprove}
          minWidth="8.75rem"
          buttonClassName="h-8"
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {length > 0 && (
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              tooLong && "rounded-full px-2 py-0.5 font-medium",
            )}
            style={
              tooLong
                ? {
                    backgroundColor: `color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))`,
                    color: `color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))`,
                  }
                : undefined
            }
            title={
              tooLong
                ? "Google suele cortar el titular por aquí en los resultados de búsqueda."
                : undefined
            }
          >
            {length}/{SEO_TITLE_MAX}
          </span>
        )}
      </div>

      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
