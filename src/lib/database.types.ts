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

/** AI transparency warning types — mirrors src/lib/ai-warnings.ts WarningType. */
type AiWarningType =
  | "price_non_european"
  | "price_subsidized"
  | "autonomy_cltc"
  | "autonomy_wltp_no_real"
  | "launch_non_european"
  | "prototype_as_product";

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
        Relationships: [];
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
          ai_warnings: { type: AiWarningType }[] | null;
          ai_discussion_prompt: string | null;
          ai_generated_at: string | null;
          seo_title: string | null;
          headline_tone: "green" | "amber" | "red" | null;
          archived: boolean;
        };
        // Explicit Insert: nullable/defaulted columns are optional, matching the
        // DB schema (mig. 02 + ALTERs). Omit<Row, ...> made every field required
        // and forced `as never` casts at every insert/update site.
        Insert: {
          source_id: string;
          title: string;
          slug: string;
          excerpt: string;
          image_url?: string | null;
          article_url: string;
          category: string;
          published_at: string;
          content_type?: string; // DEFAULT 'news' (mig. 20)
          youtube_video_id?: string | null;
          duration?: string | null;
          has_comments?: boolean; // DEFAULT false (mig. 14)
          ai_summary?: string | null;
          ai_warnings?: { type: AiWarningType }[] | null;
          ai_discussion_prompt?: string | null;
          ai_generated_at?: string | null;
          seo_title?: string | null;
          headline_tone?: "green" | "amber" | "red" | null;
        };
        // Update includes archived (omitted from Insert) so the admin can
        // archive/unarchive without a cast.
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]> & {
          archived?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: {
      // No database views are used by the app. The key is present (empty) so the
      // Database type satisfies supabase-js's GenericSchema constraint.
    };
    Functions: {
      /**
       * Full-text article search (pg_trgm + unaccent). Returns matching article
       * rows ranked by word_similarity. See migration 40 for phrase-vs-word mode.
       */
      search_articles: {
        Args: { search_query: string; max_results?: number };
        Returns: Database["public"]["Tables"]["articles"]["Row"];
        // SETOF articles — tells the typed client the return is a set of article
        // rows, so .select() with joins (source:sources!inner(...)) resolves the
        // articles→sources relationship correctly. isSetofReturn + isOneToOne
        // make the typed client type .data as Row[] (array), matching the SETOF
        // runtime behaviour (supabase-js type machinery, line 393).
        SetofOptions: {
          to: "articles";
          from: "articles";
          isSetofReturn: true;
          isOneToOne: true;
        };
      };
      /** Distinct article categories for the admin datalist (migration 43). */
      get_article_categories: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      /**
       * Per-source headline-tone counts broken down by content_type, for the
       * "Medios de Confianza" ranking. See migration 45 for the column meanings.
       */
      source_headline_ranking: {
        Args: { p_since: string };
        Returns: {
          source_id: string;
          source_name: string;
          n_green: number;
          n_amber: number;
          n_red: number;
          n_total: number;
          n_green_video: number;
          n_amber_video: number;
          n_red_video: number;
          n_total_video: number;
        };
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
