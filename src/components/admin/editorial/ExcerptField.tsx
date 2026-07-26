import CountedTextField from "./CountedTextField";
import { EXCERPT_MIN } from "@/lib/editorial-validation";

/** Google stops showing the meta description around here. */
const EXCERPT_MAX = 160;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  disabled?: boolean;
}

/**
 * The excerpt: the two lines that appear on the article card and, unless a
 * separate description is set, in Google's results.
 *
 * **Plain text, not the rich-text editor Artículos uses for this field.** The
 * excerpt is never rendered as markup anywhere it matters — a card and a meta
 * tag both strip it — so a toolbar there offers formatting that gets thrown away,
 * and a second editor on this screen would compete with the one that writes the
 * article.
 *
 * Now a thin wrapper over `CountedTextField`, which is the same chrome it used to
 * carry inline: label, textarea, counter, error. It keeps its own file because
 * the wording *is* the component — what an excerpt is for on evminds is not
 * something a generic field should know.
 *
 * The counter warns past the limit rather than erroring: a long excerpt gets
 * truncated in search results, not rejected. Being too *short* is the one that
 * blocks, and that check lives in `editorial-validation.ts` with everything else.
 */
export default function ExcerptField({ value, onChange, onBlur, error, disabled }: Props) {
  return (
    <CountedTextField
      id="post-excerpt"
      label="Extracto"
      hint="Se lee en las tarjetas del sitio y en los resultados de Google. Lo propone la IA a partir del texto."
      placeholder="Dos líneas que cuenten de qué va la pieza y por qué merece el clic."
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      required
      rows={3}
      max={EXCERPT_MAX}
      counterTitle={`Entre ${EXCERPT_MIN} y ${EXCERPT_MAX} caracteres es lo que mejor se lee.`}
      counterOverTitle="Google suele cortar la descripción por aquí en los resultados de búsqueda."
      error={error}
      disabled={disabled}
    />
  );
}
