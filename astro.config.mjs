// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";

// Own-article slugs for the sitemap. `/articulo/[slug]` is a dynamic SSR route,
// so @astrojs/sitemap can't auto-discover it — we list the URLs as customPages.
// Two sources, mirroring the runtime listing: any remaining `.md` files plus the
// published `posts` (queried at build time; RLS limits anon to published & due).
const SITE = "https://evminds.es";
const articlesDir = path.resolve("./src/content/articulos");
const now = new Date();

/**
 * @param {string} raw - Raw frontmatter block text.
 * @param {string} field - Field name to extract.
 * @returns {string | undefined}
 */
const readFrontmatterField = (raw, field) => {
  const match = raw.match(new RegExp(`^${field}:\\s*(.+?)$`, "m"));
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, "");
};

const mdArticleUrls = fs.existsSync(articlesDir)
  ? fs
      .readdirSync(articlesDir)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => {
        const raw = fs.readFileSync(path.join(articlesDir, f), "utf-8");
        const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) return false;
        const frontmatter = frontmatterMatch[1];
        const draft = readFrontmatterField(frontmatter, "draft") === "true";
        if (draft) return false;
        const dateStr = readFrontmatterField(frontmatter, "date");
        if (!dateStr) return false;
        return new Date(dateStr) <= now;
      })
      .map((f) => `${SITE}/articulo/${f.replace(".md", "")}`)
  : [];

// Reads an env var from process.env (Netlify) or falls back to .env.local / .env
// (local builds), without importing vite (not a direct dep under pnpm).
/** @param {string} key @returns {string | undefined} */
const readEnv = (key) => {
  if (process.env[key]) return process.env[key];
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = fs.readFileSync(path.resolve(file), "utf-8");
      const m = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      // file may not exist; ignore
    }
  }
  return undefined;
};

// Published posts (build-time query; never fails the build on a network error).
/** @type {string[]} */
let postArticleUrls = [];
try {
  const url = readEnv("PUBLIC_SUPABASE_URL");
  const key = readEnv("PUBLIC_SUPABASE_ANON_KEY");
  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await supabase.from("posts").select("slug"); // RLS → published & due
    postArticleUrls = (data ?? []).map((p) => `${SITE}/articulo/${p.slug}`);
  }
} catch (err) {
  console.warn("[sitemap] could not load posts slugs:", err);
}

const articlePages = [...new Set([...mdArticleUrls, ...postArticleUrls])];
// https://astro.build/config
export default defineConfig({
  // Site URL for sitemap generation
  site: "https://evminds.es",

  // Disable the Astro dev toolbar (the floating in-page toolbar in dev).
  devToolbar: { enabled: false },

  // Server-side rendering (SSR) on Netlify
  output: "server",
  adapter: netlify(),

  // `/admin/posts` became `/admin/articulos` (phase 2b, 2026-07-27), so the panel
  // speaks Spanish throughout. Kept as redirects rather than a clean break
  // because Fer's bookmarks point at the old paths, and an admin URL that 404s
  // reads as "the section is gone", not as "it moved".
  //
  // Only the two static paths live here. The dynamic one is in `netlify.toml`:
  // Astro emits a redirect target of `/admin/articulos/:id/edit/index.html`,
  // which assumes a prerendered page — and these are SSR, so that URL would 404.
  // Verified by reading the built `dist/_redirects`, which is the only place that
  // mistake is visible.
  redirects: {
    "/admin/posts": "/admin/articulos",
    "/admin/posts/new": "/admin/articulos/new",
  },

  vite: {
    plugins: [...tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },

  markdown: {
    remarkPlugins: [],
    rehypePlugins: [
      ["rehype-external-links", { target: "_blank", rel: ["noopener", "noreferrer"] }],
    ],
  },

  integrations: [react(), sitemap({ customPages: articlePages })],
});
