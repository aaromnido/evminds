import FieldCounter from "./FieldCounter";
import FieldShell from "./FieldShell";
import VisualDraftEditor from "./VisualDraftEditor";
import { CMS_LEAD_WORDS_MAX } from "@/lib/editorial-validation";

interface Props {
  /** Markdown, same stored format as the body. */
  value: string;
  onChange: (markdown: string) => void;
  copied: boolean;
  onCopy: () => void;
  error?: string | null;
  disabled?: boolean;
}

/**
 * `Entradilla` — the paragraph Motor.es prints above the article, and one of the
 * only two fields their form marks required.
 *
 * **Rich text, matching their CMS** (Fer, 2026-07-26). Their box has a small
 * toolbar (bold, italic, list, link, quote) and he wanted the same here rather
 * than plain text. It reuses `VisualDraftEditor` in its `lead` configuration
 * instead of a second editor component, so Markdown stays the one stored format
 * and there is still a single place where the
 * Markdown ↔ HTML round trip has to be kept honest.
 *
 * > **The inherited rule applies here too:** if this editor ever gains a feature
 * > `html-to-markdown.ts` does not know (a table, an inline image), it has to
 * > learn it in the same commit or it disappears silently on the next edit.
 *
 * **It is NOT the meta description, and neither prefills the other** (Fer,
 * 2026-07-26): this is an extensive opening paragraph, that is a one-sentence
 * search snippet.
 *
 * **The body must not repeat it.** Their template already prints it, so the
 * `Cuerpo noticia` starts after the lead — which is why the redactor returns the
 * two as separate fields rather than one text that gets split afterwards.
 *
 * The counter is in **words**, unlike every other field on this screen, because
 * that is how their rule is written: "Recomendadas entre 40 y 45 palabras. 50
 * Máximo". Going over warns and never blocks — being empty is the only thing
 * that blocks, and that lives in `editorial-validation.ts`.
 */
export default function LeadField({ value, onChange, copied, onCopy, error, disabled }: Props) {
  return (
    <FieldShell
      id="cms-lead"
      label="Entradilla"
      hint="El párrafo con el que abre la pieza, encima del texto. Entre 40 y 45 palabras, 50 como máximo. El cuerpo empieza después: no lo repite."
      required
      copy={{
        what: "la entradilla",
        copied,
        onCopy,
        disabled: disabled || !value.trim(),
      }}
      counter={
        <FieldCounter
          value={value}
          max={CMS_LEAD_WORDS_MAX}
          unit="words"
          title="Motor.es recomienda entre 40 y 45 palabras."
          overTitle="Motor.es pone el máximo en 50 palabras."
        />
      }
      error={error}
    >
      <VisualDraftEditor
        value={value}
        onChange={onChange}
        tools="lead"
        compact
        ariaLabel="Entradilla"
        disabled={disabled}
      />
    </FieldShell>
  );
}
