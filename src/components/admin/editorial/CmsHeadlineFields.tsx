import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CountedTextField from "./CountedTextField";
import { CMS_TITLE_MAX } from "@/lib/editorial-validation";

/** One field's copy state plus the handler that copies it. */
export interface CopyBinding {
  copied: boolean;
  onCopy: () => void;
}

interface Props {
  title: string;
  onTitleChange: (value: string) => void;
  listTitle: string;
  onListTitleChange: (value: string) => void;
  discoverTitle: string;
  onDiscoverTitleChange: (value: string) => void;
  copy: {
    title: CopyBinding;
    listTitle: CopyBinding;
    discoverTitle: CopyBinding;
  };
  /** True while "Mejorar SEO" is working on the main headline. */
  improvingSeo: boolean;
  onImproveSeo: () => void;
  titleError?: string | null;
  disabled?: boolean;
}

/**
 * Motor.es' three headlines, **in their form's order**: `Título`, `Título
 * Listados`, `Título Discover`.
 *
 * They exist because the same piece is headlined three times over there — in the
 * article, in the front-page cards, and in Google Discover — and the whole reason
 * this block spells out what each one is for is Fer's ask: not having to wonder,
 * on every article, which is which.
 *
 * `Título Listados` **starts as a copy of `Título` and keeps following it** until
 * it is edited by hand, which is Motor.es' own documented fallback. Leaving it
 * empty was the alternative and it is the worse one: an empty near-required field
 * at the end of a long screen is the exact failure the alt text already caused
 * once on step ④.
 *
 * `Título Discover` carries no counter, because their CMS states no number for it.
 * Inventing one would be presenting our guess as their rule.
 */
export default function CmsHeadlineFields({
  title,
  onTitleChange,
  listTitle,
  onListTitleChange,
  discoverTitle,
  onDiscoverTitleChange,
  copy,
  improvingSeo,
  onImproveSeo,
  titleError,
  disabled,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="grid gap-5">
      <CountedTextField
        id="cms-title"
        label="Título"
        hint="El titular del artículo. Si se pasa mucho de 65, usa el meta título en vez de recortarlo."
        value={title}
        onChange={onTitleChange}
        required
        max={CMS_TITLE_MAX}
        counterOverTitle="Motor.es recomienda 65 caracteres. Por encima, su consejo es usar el meta título."
        copy={{ what: "el título", ...copy.title }}
        assist={{
          label: "Mejorar SEO",
          runningLabel: "Mejorando…",
          running: improvingSeo,
          onClick: onImproveSeo,
        }}
        error={titleError}
        disabled={disabled}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setExpanded((prev) => !prev)}
        className="justify-self-start"
        aria-expanded={expanded}
      >
        {expanded ? "Ocultar título Listados y Discover" : "Mostrar título Listados y Discover"}
        <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
      </Button>

      {expanded && (
        <>
          <CountedTextField
            id="cms-list-title"
            label="Título Listados"
            hint="El que se lee en las tarjetas de su portada. Viene copiado del título y le sigue mientras no lo toques; escribe otro si ahí conviene uno más corto."
            value={listTitle}
            onChange={onListTitleChange}
            max={CMS_TITLE_MAX}
            counterOverTitle="Motor.es recomienda 65 caracteres."
            copy={{ what: "el título de listados", ...copy.listTitle }}
            disabled={disabled}
          />

          <CountedTextField
            id="cms-discover-title"
            label="Título Discover"
            // Their own help text, word for word: it is the clearest explanation of
            // what the field does, and copying it means the panel and their CMS say
            // the same thing.
            hint="Este título se usará durante las primeras 48 horas. Es el de Google Discover, así que va con gancho o en primera persona."
            value={discoverTitle}
            onChange={onDiscoverTitleChange}
            copy={{ what: "el título de Discover", ...copy.discoverTitle }}
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}
