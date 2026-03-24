/**
 * Shared XML parsing utilities for RSS and YouTube Atom feed parsers.
 */

/**
 * Decodes HTML entities (&#039;, &quot;, &amp;, etc.)
 */
export function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // Must be last to avoid double-decoding
}

/**
 * Extracts text content between XML tags (supports CDATA and namespaced tags)
 */
export function extractTag(xml: string, tag: string): string | null {
  const escapedTag = tag.replace(':', '\\:');
  const regex = new RegExp(
    `<${escapedTag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${escapedTag}>|<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`,
    'i'
  );
  const match = xml.match(regex);
  return match ? (match[1] || match[2] || '').trim() : null;
}
