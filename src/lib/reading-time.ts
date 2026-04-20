/**
 * Estimate reading time for an article body (raw markdown).
 */

/**
 * Strips markdown syntax (headings, links, images, bold, lists, HTML) so we
 * count only the words a reader actually reads.
 */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → keep text
    .replace(/<[^>]+>/g, "") // html tags
    .replace(/[#>*_~`\-]/g, " ") // md symbols
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function countImages(md: string): number {
  const matches = md.match(/!\[[^\]]*\]\([^)]*\)/g);
  return matches ? matches.length : 0;
}

const WORDS_PER_MINUTE = 200;
const SECONDS_PER_IMAGE = 12;

/**
 * Estimates reading time in minutes for a markdown article body.
 * Uses ceil (never undersells) and a minimum of 1 minute.
 */
export function calculateReadingTime(body: string): number {
  const words = countWords(stripMarkdown(body));
  const images = countImages(body);

  const minutes = words / WORDS_PER_MINUTE + (images * SECONDS_PER_IMAGE) / 60;
  return Math.max(1, Math.ceil(minutes));
}
