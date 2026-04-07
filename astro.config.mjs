// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// Collect article slugs from content collection for sitemap
const articlesDir = path.resolve('./src/content/articulos');
const articlePages = fs.existsSync(articlesDir)
  ? fs.readdirSync(articlesDir)
      .filter(f => f.endsWith('.md'))
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
    // @ts-expect-error - Vite peer dependency type conflict in pnpm
    plugins: [...tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },

  markdown: {
    rehypePlugins: [
      ['rehype-external-links', { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },

  integrations: [
    react(),
    sitemap({ customPages: articlePages }),
  ]
});