/**
 * Database types generated from Supabase schema
 * This ensures type safety across frontend and API routes
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
        };
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "id" | "scraped_at">;
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
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
