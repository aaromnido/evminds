import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FieldError from "./FieldError";
import RequiredMark from "./RequiredMark";

interface Props {
  date: string;
  onDateChange: (value: string) => void;
  label: string;
  hint: string;
  /**
   * Warning shown when the chosen day would not behave like scheduling — today,
   * past the publishing hour. Amber, never blocking: it is a surprise to avoid,
   * not an invalid value.
   */
  warning?: string | null;
  /**
   * Optional shortcuts beside the input (today / tomorrow / next week).
   *
   * A slot rather than props, so this component keeps knowing only about a date:
   * the shortcuts need "today", which has to come from the page, and threading
   * that through here would make every caller pass it whether it shows them or
   * not. Absence means the channel has no use for them.
   */
  quickPick?: React.ReactNode;
  error?: string | null;
  disabled?: boolean;
}

/**
 * Which day the piece goes out on this channel.
 *
 * **Day only, no time** (Fer, 2026-07-26). It had both, and the time was dropped
 * for a reason that holds on each channel separately:
 *
 * - On **Motor.es** the field never existed on their side. Fer decides the day;
 *   the hour is whatever their system does. Asking for one here invented a
 *   precision we do not have and cannot honour.
 * - On **EVminds** it is ours, so we simply fix it: 8:00 in the morning, Madrid
 *   time, every time. Nobody writing an article has an opinion about the minute,
 *   and a required field with no real answer is friction with nothing behind it.
 *
 * **Always required**, still: even on Motor.es, where the date is a prediction
 * rather than a commitment, a guess is what lets the two channels' dates be
 * lined up, and an empty field can't be lined up with anything.
 *
 * The hour is spelled out in the hint rather than left implicit. A piece that
 * goes out at a time nobody mentioned is the kind of automatic behaviour that
 * feels like a bug the first time you notice it.
 */
export default function ScheduleField({
  date,
  onDateChange,
  label,
  hint,
  warning,
  quickPick,
  error,
  disabled,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="publish-date">
        {label}
        <RequiredMark />
      </Label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Input
          id="publish-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "publish-date-error" : undefined}
          className="w-fit min-w-[9.5rem]"
        />
        {quickPick}
      </div>
      <p className="max-w-[78ch] text-xs text-muted-foreground">{hint}</p>
      {warning && (
        <p
          className="w-fit rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))`,
            color: `color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))`,
          }}
        >
          {warning}
        </p>
      )}
      <FieldError id="publish-date-error" message={error} />
    </div>
  );
}
