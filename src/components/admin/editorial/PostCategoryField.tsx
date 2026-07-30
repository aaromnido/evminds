import { Label } from "@/components/ui/label";
import { nativeFieldClass } from "@/components/ui/input";
import { VALID_POST_CATEGORIES, type PostCategory } from "@/lib/post-categories";

interface Props {
  value: PostCategory;
  onChange: (value: PostCategory) => void;
  disabled?: boolean;
}

/**
 * Which of the five own-article categories this piece is.
 *
 * A native `<select>`, same as Artículos: the panel has no select primitive in
 * `src/components/ui/`, and five fixed options do not justify adding one. It
 * borrows `nativeFieldClass` so it sits flush with the inputs around it.
 *
 * These are the **post** categories (`post-categories.ts`), never the news ones
 * (`categories.ts`) — two similar-looking constants belonging to two different
 * pipelines. It always arrives pre-selected, so it can never be the reason the
 * primary button is blocked.
 */
export default function PostCategoryField({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="post-category">Categoría</Label>
      <select
        id="post-category"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PostCategory)}
        className={nativeFieldClass}
      >
        {VALID_POST_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Propuesta por la IA a partir del texto. Cámbiala si no encaja.
      </p>
    </div>
  );
}
