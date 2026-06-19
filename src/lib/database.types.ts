/**
 * Database types for the Supabase schema.
 *
 * ⚠️ HAND-MAINTAINED — do NOT run `supabase gen types` over this file.
 * It is curated by hand (Omit-based Insert/Update helpers, the
 * `ArticleWithSource` domain helper below) and the CLI output would clobber
 * those. After any schema migration, update the relevant table block here by
 * hand to keep types in sync with the DB.
 *
 * This ensures type safety across frontend and API routes.
 */

export interface Database {
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          name: string;
          url: string;
          feed_url: string;
          feed_type: "rss" | "html";
          lang: "es" | "en";
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sources"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
      };
      articles: {
        Row: {
          id: string;
          source_id: string;
          title: string;
          slug: string;
          excerpt: string;
          image_url: string | null;
          article_url: string;
          category: string;
          published_at: string;
          scraped_at: string;
          content_type: string;
          youtube_video_id: string | null;
          duration: string | null;
          has_comments: boolean;
          ai_summary: string | null;
          ai_warnings: { type: string }[] | null;
          ai_discussion_prompt: string | null;
          ai_generated_at: string | null;
          seo_title: string | null;
          headline_tone: "green" | "amber" | "red" | null;
          archived: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "id" | "scraped_at" | "archived">;
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
      };
      posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          content: string;
          image_url: string | null;
          image_alt: string | null;
          category: string;
          tags: string[];
          author: string;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string;
          updated_at: string;
          has_comments: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          role: "admin" | "user";
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
    };
  };
}

/**
 * Helper type for article with joined source data
 */
export type ArticleWithSource = Database["public"]["Tables"]["articles"]["Row"] & {
  source: Database["public"]["Tables"]["sources"]["Row"];
};
