// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

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

  integrations: [
    react(),
    sitemap(),
  ]
});