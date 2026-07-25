import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FieldError from "./FieldError";
import ReferenceLinkRow from "./ReferenceLinkRow";
import type { ReferenceLink } from "@/lib/editorial-types";

interface Props {
  links: ReferenceLink[];
  /** Returns a problem to show under the field, or null when the link was taken. */
  onAdd: (url: string) => string | null;
  onRetry: (link: ReferenceLink) => void;
  onRemove: (link: ReferenceLink) => void;
  disabled?: boolean;
}

/** Accept a bare domain typed without the scheme, which is how people paste. */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Requirement R1: the extra sources the redactor should read before writing.
 *
 * One at a time rather than a textarea of URLs, because each link carries a
 * state and a state needs a row of its own. Adding one starts reading it right
 * away — knowing what got in matters while there is still time to react, not
 * after pressing generate.
 */
export default function ReferenceLinksField({ links, onAdd, onRetry, onRemove, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function submit() {
    const url = normalizeUrl(draft);
    if (!url) {
      setProblem("Eso no parece un enlace. Pega la dirección completa, empezando por https://");
      return;
    }
    const rejected = onAdd(url);
    setProblem(rejected);
    if (!rejected) setDraft("");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            aria-label="Enlace de documentación"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? "brief-link-error" : undefined}
            placeholder="https://…"
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={submit}
            disabled={disabled || draft.trim().length === 0}
          >
            <Plus />
            Añadir
          </Button>
        </div>
        <FieldError id="brief-link-error" message={problem} />
      </div>

      {links.length === 0 ? (
        // Not a dead end, just an honest "you don't need this": the step works
        // perfectly well with no extra sources.
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
          No has añadido ninguno. No hace falta: sin enlaces, el redactor trabaja solo con lo que
          hayas escrito arriba.
        </p>
      ) : (
        <ul className="grid">
          {links.map((link) => (
            <ReferenceLinkRow
              key={link.id}
              link={link}
              onRetry={onRetry}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
