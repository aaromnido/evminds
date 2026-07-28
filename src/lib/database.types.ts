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

/**
 * Editorial wizard channels — mirrors `PublishChannel` in src/lib/editorial-types.ts
 * and the CHECK constraint in migration 53. These identifiers are OURS (see
 * editorial-channels.ts), which is why a CHECK is legitimate for them and never
 * for anything sourced from Motor.es' CMS.
 */
type EditorialChannel = "motor" | "evminds";

/** Coarse piece state; `done` = every chosen channel is closed. Migration 53. */
type EditorialPieceStatus = "in_progress" | "done";

/**
 * Per-channel state. Both terminal values are closed, and they do NOT mean the
 * same thing: `done` is Motor.es finished on our side (publishing it is typing it
 * into their CMS), `scheduled` means a `posts` row exists.
 */
type EditorialChannelStatus = "draft" | "done" | "scheduled";

/** Mirrors `IdeaOrigin` in src/lib/editorial-types.ts. Migration 54. */
type EditorialCandidateOrigin = "curator" | "own";

/**
 * `pending` is a one-day cache of a curator batch, not durable content — see
 * migration 54. `rejected` is deliberately not a state this app writes: a
 * dismissed idea is deleted outright (Fer, 2026-07-28: discards are not
 * remembered), but the CHECK constraint only allows the four values below.
 */
type EditorialCandidateStatus = "pending" | "picked" | "saved" | "expired";

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
        Insert: Omit<
          Database["public"]["Tables"]["posts"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
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
      /**
       * A piece being written in the editorial wizard: the brief, shared by every
       * channel it goes to. See migration 53.
       *
       * `idea_id` intentionally has no foreign key, and the source is copied
       * rather than joined: the Ideas section must allow deleting, and a written
       * piece has to survive the idea it came from.
       */
      editorial_pieces: {
        Row: {
          id: string;
          brief_title: string;
          brief_angle: string;
          reference_urls: string[];
          idea_id: string | null;
          source_name: string | null;
          source_url: string | null;
          channels: EditorialChannel[];
          /** Coarse on purpose: the granular state lives per channel. */
          status: EditorialPieceStatus;
          created_at: string;
          updated_at: string;
        };
        /** Columns with a DB default are optional here, so an insert can omit them. */
        Insert: Omit<
          Database["public"]["Tables"]["editorial_pieces"]["Row"],
          "id" | "created_at" | "updated_at" | "brief_angle" | "reference_urls" | "status"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["editorial_pieces"]["Row"],
              "brief_angle" | "reference_urls" | "status"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["editorial_pieces"]["Insert"]>;
        Relationships: [];
      };
      /**
       * One row per channel a piece is written for. See migration 53 for why the
       * state is modelled per channel rather than per piece.
       */
      editorial_channel_drafts: {
        Row: {
          id: string;
          piece_id: string;
          channel: EditorialChannel;
          title: string;
          /** Markdown — the stored workspace format for both channels. */
          body: string;
          image_url: string | null;
          /** `YYYY-MM-DD`. The DAY, never an instant: the UI stopped asking for a time. */
          publish_date: string | null;
          /**
           * Channel-specific fields, deliberately untyped here. The real shape is
           * per channel and lives at the parse boundary in `editorial-types.ts`
           * (`MotorChannelPayload` / `EvmindsChannelPayload`), which is also what
           * absorbs Motor.es' deferred CMS fields without a schema change.
           */
          payload: Record<string, unknown>;
          status: EditorialChannelStatus;
          /** The `posts` row this channel created, so re-editing moves it instead of duplicating it. */
          post_id: string | null;
          created_at: string;
          updated_at: string;
        };
        /**
         * `post_id` is optional on purpose: it is set later, when the channel
         * actually creates its `posts` row (phase 4), so an autosave must not be
         * forced to say anything about it.
         */
        Insert: Omit<
          Database["public"]["Tables"]["editorial_channel_drafts"]["Row"],
          "id" | "created_at" | "updated_at" | "title" | "body" | "payload" | "status" | "post_id"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["editorial_channel_drafts"]["Row"],
              "title" | "body" | "payload" | "status" | "post_id"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["editorial_channel_drafts"]["Insert"]>;
        Relationships: [];
      };
      /**
       * The curator's idea bank (step ① of the wizard). See migration 54 for the
       * full persistence model — in short, `pending` rows are a cache with a
       * shelf life (`expires_at`), only `picked`/`saved`/`own` rows are durable.
       */
      editorial_candidates: {
        Row: {
          id: string;
          origin: EditorialCandidateOrigin;
          /** NULL only for `origin: "own"` — see the CHECK in migration 54. */
          source_url: string | null;
          source_title: string | null;
          source_name: string | null;
          source_excerpt: string | null;
          proposed_title_es: string;
          angle: string;
          rationale: string;
          reference_urls: string[];
          status: EditorialCandidateStatus;
          fetched_at: string;
          picked_at: string | null;
          /** Only meaningful while `status: "pending"`. */
          expires_at: string | null;
          created_at: string;
        };
        /** Columns with a DB default are optional here, so an insert can omit them. */
        Insert: Omit<
          Database["public"]["Tables"]["editorial_candidates"]["Row"],
          | "id"
          | "created_at"
          | "rationale"
          | "reference_urls"
          | "status"
          | "fetched_at"
          | "picked_at"
          | "expires_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["editorial_candidates"]["Row"],
              "rationale" | "reference_urls" | "status" | "fetched_at" | "picked_at" | "expires_at"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["editorial_candidates"]["Insert"]>;
        Relationships: [];
      };
      /**
       * Short-lived exclusion cache, NOT part of the idea bank (migration 56).
       * `curate-ideas.ts` reads it so "Volver a generar" doesn't immediately
       * re-propose an article just dismissed; nothing else reads this table.
       */
      editorial_dismissed_urls: {
        Row: {
          source_url: string;
          dismissed_at: string;
        };
        Insert: {
          source_url: string;
          dismissed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["editorial_dismissed_urls"]["Insert"]>;
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
      /** Distinct article categories for the admin datalist (migration 43),
       *  optionally filtered by content_type for the public category-filter
       *  pills (migration 49). p_content_type is optional so the existing
       *  zero-argument admin calls keep working unchanged. */
      get_article_categories: {
        Args: { p_content_type?: string };
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
      /**
       * Fuzzy dedup for the curator (migration 55): which of `candidate_titles`
       * already collide (word_similarity) with a `posts.title` published in the
       * last `days` days. Same accent-fold + lowercase technique as
       * `search_articles`, applied to our own Spanish titles on both sides.
       */
      covered_post_titles: {
        Args: { candidate_titles: string[]; days?: number; threshold?: number };
        Returns: string[];
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
