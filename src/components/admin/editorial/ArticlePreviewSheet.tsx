import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import RenderedArticleBody from "./RenderedArticleBody";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  imageUrl: string;
  /** CSS filter of the chosen AI variation, so the preview matches the editor. */
  imageFilter?: string;
  /** Where this would be published, named in the header. */
  channelName: string;
}

/**
 * The piece as it would read, hero image included.
 *
 * A drawer and not a new route: previewing is a look, not a destination, and
 * losing the editor behind a navigation to come back to it is how you lose your
 * place in a long text. Closing it puts you back exactly where you were.
 *
 * It differs from the editor's HTML view in what it adds around the text: the
 * hero image, the headline and a reading measure. The body itself is the same
 * component in both, so they can never drift apart.
 */
export default function ArticlePreviewSheet({
  open,
  onOpenChange,
  title,
  body,
  imageUrl,
  imageFilter,
  channelName,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Width, per Fer's spec: half the viewport, but never under 780px from
        // 805px up, and `100vw - 24px` below that so it still reads as a drawer.
        // The floor matters here and not in the other drawers because this one
        // shows a laid-out article: under ~780px the hero image and the text
        // stop looking like the piece they are previewing.
        // `min-width` beats `max-width` in CSS, so the two rules compose without
        // a media query of their own.
        className="w-[calc(100vw-24px)]! gap-0 p-0 sm:max-w-[50vw]! min-[805px]:min-w-[780px]!"
        aria-label="Previsualización"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-lg">Así quedaría</SheetTitle>
          <SheetDescription>
            Aproximación de cómo se leerá en {channelName}. El diseño final lo pone el medio.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <article className="mx-auto max-w-[70ch]">
            {/* Headline first, then image, then text (Fer, 2026-07-25): it is
                the order the piece is read in, and the order both outlets lay
                their articles out. */}
            <h1 className="mb-6 text-3xl font-semibold leading-tight tracking-tight text-balance">
              {title}
            </h1>

            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="mb-6 aspect-video w-full rounded-xl object-cover"
                style={imageFilter ? { filter: imageFilter } : undefined}
              />
            )}

            {/* Safe: `markdownToHtml` escapes everything that isn't Markdown syntax. */}
            <RenderedArticleBody body={body} />
          </article>
        </div>
      </SheetContent>
    </Sheet>
  );
}
