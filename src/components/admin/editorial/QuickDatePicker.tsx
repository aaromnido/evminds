import { nativeFieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { shiftDateByDays } from "@/lib/editorial-utils";

interface Props {
  /** Today in Madrid, `YYYY-MM-DD`, computed by the page. */
  today: string;
  /** Current field value. The selected option is derived from it, never stored. */
  value: string;
  onPick: (date: string) => void;
  disabled?: boolean;
}

/** Value of the stand-in option, which is never a choice the user can apply. */
const CUSTOM = "";

const SHORTCUTS: { label: string; days: number }[] = [
  { label: "Hoy", days: 0 },
  { label: "Mañana", days: 1 },
  { label: "La semana que viene", days: 7 },
];

/**
 * A dropdown of relative dates that fills the date field: today, tomorrow, next
 * week. Fer's request (2026-07-26), for the **first** channel's screen only — the
 * following one already arrives with a date, so shortcuts there would reopen a
 * question that is already answered.
 *
 * **The selected option is derived from the date, not remembered.** That is the
 * one thing that has to be right here: a select that stored its own choice would
 * still read "Mañana" after the date was edited by hand, which is a control lying
 * about its own state. Comparing against the field on every render makes that
 * impossible, and the stand-in option covers the case where the date matches none
 * of the three ("Otra fecha") or is still empty ("Elegir…").
 *
 * Native `<select>` with `nativeFieldClass`, same as the category field: the panel
 * has no select primitive, and three fixed options do not justify adding one.
 */
export default function QuickDatePicker({ today, value, onPick, disabled }: Props) {
  const options = SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    date: shiftDateByDays(today, shortcut.days),
  }));

  const selected = options.find((option) => option.date && option.date === value)?.date ?? CUSTOM;

  return (
    <select
      aria-label="Atajos de fecha"
      value={selected}
      disabled={disabled}
      onChange={(e) => {
        // Picking the stand-in means nothing: it exists to be *shown*, not chosen.
        if (e.target.value === CUSTOM) return;
        onPick(e.target.value);
      }}
      className={cn(nativeFieldClass, "w-fit min-w-[11rem]")}
    >
      <option value={CUSTOM}>{value ? "Otra fecha" : "Elegir…"}</option>
      {options.map(({ label, date }) => (
        <option key={label} value={date}>
          {label}
        </option>
      ))}
    </select>
  );
}
