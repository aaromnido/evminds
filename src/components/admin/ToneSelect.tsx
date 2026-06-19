import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_DEFINITIONS, type HeadlineTone } from "@/lib/headline-tone";

/**
 * Headline-tone picker for the news editor (A12 "Medios de Confianza").
 *
 * A styled Base UI Select (not a native <select>, which renders an OS menu that
 * clashes with the admin UI) showing a real colored dot per option so the
 * traffic-light meaning reads at a glance. `name`/`defaultValue` integrate with
 * the surrounding native POST form: an empty value ("Sin clasificar") maps to
 * null server-side.
 */

type ToneValue = HeadlineTone | "";

const OPTIONS: { value: ToneValue; label: string }[] = [
  { value: "", label: "Sin clasificar" },
  ...(Object.keys(TONE_DEFINITIONS) as HeadlineTone[]).map((t) => ({
    value: t,
    label: TONE_DEFINITIONS[t].label.es,
  })),
];

function labelFor(value: ToneValue): string {
  return value ? TONE_DEFINITIONS[value].label.es : "Sin clasificar";
}

function Dot({ tone }: { tone: ToneValue }) {
  if (!tone) {
    return (
      <span className="inline-block size-2.5 shrink-0 rounded-full border border-muted-foreground/50" />
    );
  }
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: `var(${TONE_DEFINITIONS[tone].colorVar})` }}
    />
  );
}

export default function ToneSelect({
  name,
  defaultValue = "",
}: {
  name: string;
  defaultValue?: ToneValue;
}) {
  return (
    <Select.Root name={name} defaultValue={defaultValue}>
      <Select.Trigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 data-[popup-open]:border-ring",
        )}
      >
        <Select.Value>
          {(value: ToneValue) => (
            <span className="flex items-center gap-2">
              <Dot tone={value} />
              {labelFor(value)}
            </span>
          )}
        </Select.Value>
        <Select.Icon className="ml-auto">
          <ChevronsUpDown className="size-4 opacity-50" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50" sideOffset={4}>
          <Select.Popup
            className={cn(
              "max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto",
              "rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
            )}
          >
            {OPTIONS.map((opt) => (
              <Select.Item
                key={opt.value || "none"}
                value={opt.value}
                className={cn(
                  "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                )}
              >
                <Dot tone={opt.value} />
                <Select.ItemText>{opt.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
