import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { createSupabaseArticlesLoader } from "./loaders/supabase-loader";

// Environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables in live.config.ts. Check .env.local configuration."
  );
}

/**
 * Live collection for articles
 * Data is fetched at runtime from Supabase, not at build time
 */
const articles = defineLiveCollection({
  loader: createSupabaseArticlesLoader(supabaseUrl, supabaseAnonKey),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    excerpt: z.string(),
    image_url: z.string().nullable(),
    article_url: z.string().url(),
    category: z.string(),
    published_at: z.coerce.date(),
    scraped_at: z.coerce.date(),
    source_name: z.string(),
    source_url: z.string().url(),
  }),
});

export const collections = { articles };
