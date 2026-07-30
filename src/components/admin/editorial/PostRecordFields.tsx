import SlugField from "@/components/admin/SlugField";
import TagsField from "@/components/admin/TagsField";
import ExcerptField from "./ExcerptField";
import FieldError from "./FieldError";
import PostCategoryField from "./PostCategoryField";
import type { PostCategory } from "@/lib/post-categories";

interface Props {
  slug: string;
  onSlugChange: (value: string) => void;
  /** Stops the slug from following the headline any more. */
  onSlugManualEdit: () => void;
  excerpt: string;
  onExcerptChange: (value: string) => void;
  onExcerptBlur?: () => void;
  excerptError?: string | null;
  category: PostCategory;
  onCategoryChange: (value: PostCategory) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  slugError?: string | null;
  disabled?: boolean;
}

/**
 * What an EVminds article needs beyond text, image and date — the fields that
 * make step ④ more than a copy of step ③.
 *
 * It exists because publishing here is not handing a text to someone else: it
 * creates a row in our own `posts` table, and that row has a URL, a category,
 * tags and an excerpt. Motor.es' screen never shows this block, because none of
 * it applies to a piece that lives in someone else's CMS.
 *
 * **The pieces are the ones Artículos already uses** — `SlugField`, `TagsField`,
 * the post categories — rather than lookalikes: the same field should behave the
 * same in both places. What is NOT reused is `PostEditor` itself: it is a
 * server-submitted `<form>` with two HTML rich-text editors, and dropping it in
 * here would put a second editor beside the Markdown one and a second way of
 * saving beside the wizard's.
 *
 * The excerpt is first because it is the only one that needs writing; the rest
 * arrive filled in and are usually just glanced at.
 */
export default function PostRecordFields({
  slug,
  onSlugChange,
  onSlugManualEdit,
  excerpt,
  onExcerptChange,
  onExcerptBlur,
  excerptError,
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  slugError,
  disabled,
}: Props) {
  return (
    <div className="grid gap-5">
      <ExcerptField
        value={excerpt}
        onChange={onExcerptChange}
        onBlur={onExcerptBlur}
        error={excerptError}
        disabled={disabled}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <PostCategoryField value={category} onChange={onCategoryChange} disabled={disabled} />
        <TagsField
          value={tags}
          onChange={onTagsChange}
          id="post-tags"
          hint="Propuestos por la IA. Pulsa Enter o coma para añadir."
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        {/* Same control and same pencil gesture as Artículos, and it keeps
            following the headline until it is edited by hand — including when
            "Mejorar SEO" rewrites the headline. */}
        <SlugField
          slug={slug}
          onChange={onSlugChange}
          onManualEdit={onSlugManualEdit}
          prefix="/articulo/"
        />
        <FieldError message={slugError} />
      </div>
    </div>
  );
}
