import { cn } from "@/lib/utils";
import { markdownToHtml } from "@/lib/markdown";

interface Props {
  /** Markdown source. Converted here so callers never handle raw HTML. */
  body: string;
  className?: string;
}

/**
 * The draft rendered as it will read.
 *
 * Shared by the HTML view of the editor and the full preview, so the text looks
 * the same in both and there is a single place to restyle it.
 *
 * Styled with arbitrary variants rather than a class in `global.css`: these are
 * the only two places that render our Markdown, so the styles travel with the
 * component and the shared stylesheet is left alone.
 *
 * Injecting HTML is safe here because `markdownToHtml` escapes everything in the
 * source that is not Markdown syntax, and only lets `http(s)`, relative and
 * anchor links through.
 */
export default function RenderedArticleBody({ body, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-4 text-base leading-relaxed",
        "[&_a]:underline [&_a]:underline-offset-4",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm",
        "[&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold",
        "[&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: output of our own escaping converter
      dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }}
    />
  );
}
