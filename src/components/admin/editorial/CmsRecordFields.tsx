import TagsField from "@/components/admin/TagsField";
import CopyFieldButton from "./CopyFieldButton";
import CountedTextField from "./CountedTextField";
import type { CopyBinding } from "./CmsHeadlineFields";
import { CMS_TAGS_MAX } from "@/lib/editorial-validation";

interface Props {
  brand: string;
  onBrandChange: (value: string) => void;
  model: string;
  onModelChange: (value: string) => void;
  sourceName: string;
  onSourceNameChange: (value: string) => void;
  sourceUrl: string;
  onSourceUrlChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  copy: {
    brand: CopyBinding;
    model: CopyBinding;
    sourceName: CopyBinding;
    sourceUrl: CopyBinding;
    tags: CopyBinding;
  };
  disabled?: boolean;
}

/**
 * The tail of Motor.es' form: `Marca` + `Modelo`, `Fuente` + `Url fuente`, and
 * `Tags`. In their order, and — for the two pairs — in their **two-column
 * layout**.
 *
 * The layout is copied on purpose, not for looks: this screen is read alongside
 * theirs, and matching shapes are part of what lets you tell where you are
 * without re-reading labels. Two of their fields sit between ours down here and
 * are skipped (`Crédito imágenes`, `Mostrar en home`) — Fer's call.
 *
 * **`Marca` and `Modelo` are plain text, not selects.** Over there they are two
 * dependent dropdowns backed by their catalogue of makes and models, which we do
 * not have; a copy of it would drift from theirs and end up missing the very
 * model Fer needs, which is worse than not having one. And the good answer falls
 * out of what this screen is for: he does not need to *select* the model here, he
 * needs to **know which one to select over there**. Two text fields the AI fills
 * in give exactly that without pretending we own their data. A real select needs
 * their catalogue as an actual data source, and that is a different, bigger job.
 *
 * **`Fuente` and `Url fuente` arrive prefilled** from the idea's source when the
 * piece came from one (step ①), and empty for something written from scratch.
 *
 * **`Tags` is 2 to 5**, and their help text adds a detail with a real cost: "los
 * tags nuevos no se mostrarán hasta ser validados". So inventing one buys a wait,
 * and preferring tags that already exist over there is worth the second of
 * thought — which is why the hint says so instead of leaving it to be discovered.
 */
export default function CmsRecordFields({
  brand,
  onBrandChange,
  model,
  onModelChange,
  sourceName,
  onSourceNameChange,
  sourceUrl,
  onSourceUrlChange,
  tags,
  onTagsChange,
  copy,
  disabled,
}: Props) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <CountedTextField
          id="cms-brand"
          label="Marca"
          hint="Marca de coches relacionada. Allí es un desplegable: esto te dice cuál elegir."
          placeholder="Ej.: Nissan"
          value={brand}
          onChange={onBrandChange}
          copy={{ what: "la marca", ...copy.brand }}
          disabled={disabled}
        />
        <CountedTextField
          id="cms-model"
          label="Modelo"
          hint="Modelo de coche relacionado. Depende de la marca en su desplegable."
          placeholder="Ej.: Micra"
          value={model}
          onChange={onModelChange}
          copy={{ what: "el modelo", ...copy.model }}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CountedTextField
          id="cms-source-name"
          label="Fuente"
          hint="El medio del que sale la historia, si la recoges de otro. Viene de la idea."
          placeholder="Ej.: El País"
          value={sourceName}
          onChange={onSourceNameChange}
          copy={{ what: "la fuente", ...copy.sourceName }}
          disabled={disabled}
        />
        <CountedTextField
          id="cms-source-url"
          label="Url fuente"
          hint="El enlace a esa noticia original."
          placeholder="Ej.: http://www.elpais.com"
          value={sourceUrl}
          onChange={onSourceUrlChange}
          copy={{ what: "la URL de la fuente", ...copy.sourceUrl }}
          disabled={disabled}
        />
      </div>

      <TagsField
        value={tags}
        onChange={onTagsChange}
        id="cms-tags"
        hint="Recomendado entre 2 y 5. Prefiere etiquetas que ya existan allí: las nuevas no se muestran hasta que alguien las valida."
        max={CMS_TAGS_MAX}
        headerAction={
          <CopyFieldButton
            what="los tags"
            copied={copy.tags.copied}
            onCopy={copy.tags.onCopy}
            disabled={disabled || tags.length === 0}
          />
        }
        disabled={disabled}
      />
    </div>
  );
}
