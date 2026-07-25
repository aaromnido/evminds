import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FieldError from "./FieldError";

interface Props {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  label: string;
  hint: string;
  error?: string | null;
  disabled?: boolean;
}

/**
 * When the piece goes out on this channel.
 *
 * **Always required** (Fer, 2026-07-26): even on Motor.es, where the date is a
 * prediction rather than a decision, a guess is still required — it is what
 * lets the two dates be lined up, and an empty field can't be lined up with
 * anything. The per-channel hint still says whether it's a real commitment or
 * an estimate to correct later.
 *
 * **Date and time as two separate fields**, not one `datetime-local` (Fer,
 * 2026-07-26): a single combined control reads as one decision, when picking
 * the day and picking the hour are two different questions with two different
 * answers ("the 30th" vs "first thing in the morning"). Both native controls
 * (`type="date"` / `type="time"`) beat a custom picker for the same reason the
 * combined one did: keyboard-accessible and localized for free, and this panel
 * has no date-picker primitive to reuse.
 */
export default function ScheduleField({
  date,
  time,
  onDateChange,
  onTimeChange,
  label,
  hint,
  error,
  disabled,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="publish-date">{label}</Label>
      <div className="flex flex-wrap gap-2">
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
        <Input
          id="publish-time"
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "publish-date-error" : undefined}
          aria-label="Hora de publicación"
          className="w-fit min-w-[7rem]"
        />
      </div>
      <p className="max-w-[78ch] text-xs text-muted-foreground">{hint}</p>
      <FieldError id="publish-date-error" message={error} />
    </div>
  );
}
