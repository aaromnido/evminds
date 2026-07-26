import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import FieldError from "./FieldError";
import RequiredMark from "./RequiredMark";
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
 * The counter mirrors the headline's `n/60`: a **warning, not an error** past the
 * limit, in the same amber pill this panel uses for "over the line but valid",
 * because a long excerpt gets truncated in search results, not rejected. Being
 * too *short* is the one that blocks, and that check lives in
 * `editorial-validation.ts` with everything else.
 */
export default function ExcerptField({ value, onChange, onBlur, error, disabled }: Props) {
  const length = value.trim().length;
  const tooLong = length > EXCERPT_MAX;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="post-excerpt">
        Extracto
        <RequiredMark />
      </Label>
      <Textarea
        id="post-excerpt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        rows={3}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "post-excerpt-error" : undefined}
        placeholder="Dos líneas que cuenten de qué va la pieza y por qué merece el clic."
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="max-w-[68ch] text-xs text-muted-foreground">
          Se lee en las tarjetas del sitio y en los resultados de Google. Lo propone la IA a partir
          del texto.
        </p>
        {length > 0 && (
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              tooLong && "rounded-full px-2 py-0.5 font-medium",
            )}
            style={
              tooLong
                ? {
                    backgroundColor: `color-mix(in oklab, var(--ev-tone-amber) 18%, var(--background))`,
                    color: `color-mix(in oklab, var(--ev-tone-amber) 45%, var(--foreground))`,
                  }
                : undefined
            }
            title={
              tooLong
                ? "Google suele cortar la descripción por aquí en los resultados de búsqueda."
                : `Entre ${EXCERPT_MIN} y ${EXCERPT_MAX} caracteres es lo que mejor se lee.`
            }
          >
            {length}/{EXCERPT_MAX}
          </span>
        )}
      </div>
      <FieldError id="post-excerpt-error" message={error} />
    </div>
  );
}
