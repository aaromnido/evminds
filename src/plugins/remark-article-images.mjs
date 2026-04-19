import { visit } from 'unist-util-visit';

/**
 * Remark plugin that rewrites bare image filenames in articles
 * to their full path using the `imageFolder` frontmatter field.
 *
 * Example: ![alt](photo.png) with imageFolder: "0002"
 *   → ![alt](/images/articulos/0002/photo.png)
 */
export function remarkArticleImages() {
  return (tree, file) => {
    const imageFolder = file.data.astro?.frontmatter?.imageFolder;
    if (!imageFolder) return;

    visit(tree, 'image', (node) => {
      const src = node.url;
      // Only rewrite bare filenames (no slashes, no protocol)
      if (src && !src.includes('/') && !src.startsWith('http')) {
        node.url = `/images/articulos/${imageFolder}/${src}`;
      }
    });
  };
}
