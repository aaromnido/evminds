import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import AiAssistButton from "./AiAssistButton";

interface Props {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  running: boolean;
  onRun: () => void;
  runLabel: string;
  runningLabel: string;
  hint: string;
  disabled?: boolean;
  /** Fill the available height, letting the textarea take the slack. */
  grow?: boolean;
}

/**
 * Prompt + AI button, shared by the two things the AI does with an image:
 * retouching the one you uploaded, and producing one when you have none.
 *
 * A textarea of three rows rather than a single line (Fer, 2026-07-25):
 * describing an image takes a couple of sentences, and a one-line input hides
 * what you wrote the moment you go past it.
 */
export default function ImagePromptField({
  id,
  label,
  placeholder,
  value,
  onChange,
  running,
  onRun,
  runLabel,
  runningLabel,
  hint,
  disabled,
  grow,
}: Props) {
  return (
    // `grow` turns the field into a column that fills whatever height it is
    // given, with the textarea taking the slack. It is what lets the generate
    // panel match the drop zone's height without leaving dead space under the
    // box (Fer, 2026-07-25).
    <div className={cn("gap-2", grow ? "flex h-full flex-col" : "grid")}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || running}
        rows={3}
        placeholder={placeholder}
        // An explicit height beats `field-sizing: content`, so the box fills the
        // column instead of shrinking to its text.
        className={cn(grow && "h-full min-h-24 flex-1")}
      />
      <div className="flex flex-wrap items-center gap-3">
        <AiAssistButton
          label={runLabel}
          runningLabel={runningLabel}
          running={running}
          disabled={disabled || value.trim().length === 0}
          onClick={onRun}
          minWidth="10.5rem"
        />
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}
