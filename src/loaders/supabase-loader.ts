import type { LiveLoader } from "astro:content";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Article data structure for live collection
 */
export interface ArticleData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  article_url: string;
  category: string;
  content_type: 'news' | 'video' | 'blog';
  youtube_video_id?: string | null;
  published_at: Date;
  scraped_at: Date;
  source_name: string;
  source_url: string;
}

/**
 * Filter options for article queries
 */
export interface ArticleFilter {
  category?: string;
  limit?: number;
  cursor?: string; // ISO timestamp for pagination
}

/**
 * Create a live loader for Supabase articles
 */
export function createSupabaseArticlesLoader(
  supabaseUrl: string,
  supabaseKey: string
): LiveLoader<ArticleData, ArticleFilter> {
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  return {
    /**
     * Load collection of articles with optional filtering
     */
    loadCollection: async (filter) => {
      try {
        const limit = filter?.limit || 12;

        // Build query with source join
        let query = supabase
          .from("articles")
          .select(
            `
            id,
            slug,
            title,
            excerpt,
            image_url,
            article_url,
            category,
            content_type,
            youtube_video_id,
            published_at,
            scraped_at,
            source:sources!inner(name, url)
          `
          )
          .order("scraped_at", { ascending: false })
          .limit(limit);

        // Apply cursor pagination
        if (filter?.cursor) {
          query = query.lt("scraped_at", filter.cursor);
        }

        // Apply category filter
        if (filter?.category) {
          query = query.eq("category", filter.category);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          console.error("Supabase query error:", queryError);
          return {
            error: {
              message: "Failed to fetch articles from database",
              code: "DATABASE_ERROR",
            },
          };
        }

        // Map to ArticleData format with Live Collection structure
        const entries = data
          .filter((article) => article.source) // Filter out entries without source
          .map((article) => {
            const source = Array.isArray(article.source)
              ? article.source[0]
              : article.source;

            return {
              id: article.id,
              data: {
                id: article.id,
                slug: article.slug,
                title: article.title,
                excerpt: article.excerpt,
                image_url: article.image_url,
                article_url: article.article_url,
                category: article.category,
                content_type: article.content_type || 'news',
                youtube_video_id: article.youtube_video_id || null,
                published_at: new Date(article.published_at),
                scraped_at: new Date(article.scraped_at),
                source_name: source.name,
                source_url: source.url,
              },
            };
          });

        return {
          entries,
          // Cache hints for CDN optimization
          cache: {
            tags: ["articles", filter?.category && `category:${filter.category}`].filter(Boolean) as string[],
            // Stale after 5 minutes, refresh in background
            maxAge: 300,
          },
        };
      } catch (err) {
        console.error("Unexpected error in loadCollection:", err);
        return {
          error: {
            message: "Internal server error",
            code: "INTERNAL_ERROR",
          },
        };
      }
    },

    /**
     * Load a single article by ID
     */
    loadEntry: async (id) => {
      try {
        const { data, error: queryError } = await supabase
          .from("articles")
          .select(
            `
            id,
            slug,
            title,
            excerpt,
            image_url,
            article_url,
            category,
            content_type,
            youtube_video_id,
            published_at,
            scraped_at,
            source:sources!inner(name, url)
          `
          )
          .eq("id", id)
          .single();

        if (queryError) {
          if (queryError.code === "PGRST116") {
            // Not found
            return { entry: null };
          }
          console.error("Supabase query error:", queryError);
          return {
            error: {
              message: "Failed to fetch article",
              code: "DATABASE_ERROR",
            },
          };
        }

        if (!data.source) {
          return { entry: null };
        }

        const source = Array.isArray(data.source)
          ? data.source[0]
          : data.source;

        const articleData: ArticleData = {
          id: data.id,
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          image_url: data.image_url,
          article_url: data.article_url,
          category: data.category,
          content_type: data.content_type || 'news',
          youtube_video_id: data.youtube_video_id || null,
          published_at: new Date(data.published_at),
          scraped_at: new Date(data.scraped_at),
          source_name: source.name,
          source_url: source.url,
        };

        return {
          entry: {
            id: data.id,
            data: articleData,
          },
          cache: {
            tags: [`article:${id}`],
            maxAge: 300,
          },
        };
      } catch (err) {
        console.error("Unexpected error in loadEntry:", err);
        return {
          error: {
            message: "Internal server error",
            code: "INTERNAL_ERROR",
          },
        };
      }
    },
  };
}
