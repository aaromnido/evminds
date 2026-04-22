// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// Collect article slugs from content collection for sitemap.
// Mirror the same filters as the detail/listing pages:
// exclude drafts and articles scheduled in the future.
const articlesDir = path.resolve('./src/content/articulos');
const now = new Date();

const readFrontmatterField = (raw, field) => {
  const match = raw.match(new RegExp(`^${field}:\\s*(.+?)$`, 'm'));
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, '');
};

const articlePages = fs.existsSync(articlesDir)
  ? fs.readdirSync(articlesDir)
    .filter(f => f.endsWith('.md'))
    .filter(f => {
      const raw = fs.readFileSync(path.join(articlesDir, f), 'utf-8');
      const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) return false;
      const frontmatter = frontmatterMatch[1];
      const draft = readFrontmatterField(frontmatter, 'draft') === 'true';
      if (draft) return false;
      const dateStr = readFrontmatterField(frontmatter, 'date');
      if (!dateStr) return false;
      return new Date(dateStr) <= now;
    })
    .map(f => `https://evminds.es/articulo/${f.replace('.md', '')}`)
  : [];
// https://astro.build/config
export default defineConfig({
  // Site URL for sitemap generation
  site: 'https://evminds.es',

  // Enable server-side rendering for Live Collections
  output: 'server',
  adapter: netlify(),

  vite: {
    plugins: [...tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },

  markdown: {
    remarkPlugins: [],
    rehypePlugins: [
      ['rehype-external-links', { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },

  integrations: [
    react(),
    sitemap({ customPages: articlePages }),
  ]
});