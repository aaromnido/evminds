import CountedTextField from "./CountedTextField";
import type { CopyBinding } from "./CmsHeadlineFields";
import { CMS_META_DESCRIPTION_MAX, CMS_TITLE_MAX } from "@/lib/editorial-validation";

interface Props {
  metaTitle: string;
  onMetaTitleChange: (value: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (value: string) => void;
  /** The headline these two would override, shown as the placeholder. */
  fallbackTitle: string;
  copy: {
    metaTitle: CopyBinding;
    metaDescription: CopyBinding;
  };
  disabled?: boolean;
}

/**
 * `Meta título` and `Meta descripción` — **both optional, and usually empty**.
 *
 * This is the correction the real CMS screenshot forced on the mapping document
 * (2026-07-26), and it matters more than it sounds: the mapping had them as two
 * more fields to fill on every article, with 50–65 and 135–155 bands. Their own
 * help text says otherwise — "solo lo utilizamos si queremos modificar el título
 * en las búsquedas" — and `Título`'s hint completes the rule: "si sobrepasa mucho
 * esta cifra usar metatítulo".
 *
 * So they are the **escape valve for a long headline**, never required and never
 * blocking the primary action. The block says that out loud, because on a screen
 * whose other fields all arrive filled in, two empty ones read as "the AI failed"
 * rather than "this is normal".
 *
 * The placeholder shows the headline they would replace, which is what makes the
 * decision checkable: you can see what Google would get if you leave it empty.
 */
export default function CmsSearchFields({
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  fallbackTitle,
  copy,
  disabled,
}: Props) {
  return (
    <div className="grid gap-5">
      <CountedTextField
        id="cms-meta-title"
        label="Meta título"
        hint="Solo se usa si quieres otro título en los resultados de Google. Vacío es lo normal: se usa el título."
        placeholder={fallbackTitle || "Se usará el título del artículo"}
        value={metaTitle}
        onChange={onMetaTitleChange}
        max={CMS_TITLE_MAX}
        counterOverTitle="Motor.es recomienda 65 caracteres."
        copy={{ what: "el meta título", ...copy.metaTitle }}
        disabled={disabled}
      />

      <CountedTextField
        id="cms-meta-description"
        label="Meta descripción"
        hint="Una frase para el resultado de búsqueda, no un párrafo. Vacío es lo normal. No tiene nada que ver con la entradilla."
        placeholder="Solo si quieres controlar lo que se lee bajo el título en Google."
        value={metaDescription}
        onChange={onMetaDescriptionChange}
        rows={2}
        max={CMS_META_DESCRIPTION_MAX}
        counterOverTitle="Google suele cortar la descripción por aquí en los resultados de búsqueda."
        copy={{ what: "la meta descripción", ...copy.metaDescription }}
        disabled={disabled}
      />
    </div>
  );
}
