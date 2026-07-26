import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { nativeFieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  /** Current tags. The parent owns them, so both callers can prefill. */
  value: string[];
  onChange: (tags: string[]) => void;
  /**
   * When set, a hidden input carries the comma-joined value under this name.
   *
   * Its absence is how a caller says "this is not inside a form" — which is the
   * difference between Artículos (a `<form method="POST">`) and the editorial
   * wizard (client state that never submits). A `showHiddenInput` boolean would
   * say the same thing while hiding the reason.
   */
  name?: string;
  id?: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Tags as chips: type, press Enter or comma, Backspace on an empty box removes
 * the last one.
 *
 * Lifted out of `PostEditor` unchanged so the editorial wizard's article record
 * uses the very same control instead of a near-copy. Two tag inputs that behave
 * slightly differently is the kind of drift that makes a panel feel assembled by
 * different people.
 */
export default function TagsField({
  value,
  onChange,
  name,
  id = "tag-input",
  label = "Tags",
  hint = "Pulsa Enter o coma para añadir.",
  placeholder = "Tesla, batería, …",
  disabled,
}: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.trim().replace(/,$/, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {name && <input type="hidden" name={name} value={value.join(",")} />}
      <div
        className={cn(nativeFieldClass, "flex min-h-9 flex-wrap gap-1.5 py-1.5")}
        onClick={() => document.getElementById(id)?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="h-6 gap-1 px-2 py-0.5 text-xs">
            {tag}
            <button
              type="button"
              aria-label={`Eliminar tag ${tag}`}
              disabled={disabled}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
