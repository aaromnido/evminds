import { formatDate } from "@/lib/date-utils";
import { getContentUrl } from "@/lib/article-url";
import { getCategorySlugByName } from "@/lib/categories";
import { stripHtml } from "@/lib/html-utils";

/** Normalized article shape used across listings, cards and detail pages. */
export interface ArticleData {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  excerpt: string;
  image_url: string | null;
  article_url: string;
  category: string;
  content_type: "news" | "video" | "article";
  youtube_video_id?: string | null;
  published_at: Date;
  scraped_at: Date;
  source_name: string;
  source_url: string;
}

/** Number of articles loaded on initial page render (index + category pages) */
export const INITIAL_ARTICLES_LIMIT = 24;

/** Default number of articles per API pagination request */
export const API_DEFAULT_LIMIT = 12;

/** Shared Supabase select fields for article listings with source join */
export const ARTICLE_SELECT =
  "id, slug, title, seo_title, excerpt, image_url, article_url, category, content_type, youtube_video_id, published_at, scraped_at, source:sources!inner(name, url)";

/**
 * Normalize a raw Supabase article row (with joined source) into ArticleData.
 * Handles the source field being either an array or object (Supabase join quirk).
 */
export function normalizeArticle(raw: any): ArticleData {
  const source = Array.isArray(raw.source) ? raw.source[0] : raw.source;
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    seo_title: raw.seo_title ?? null,
    excerpt: raw.excerpt,
    image_url: raw.image_url,
    article_url: raw.article_url,
    category: raw.category,
    content_type: raw.content_type || 'news',
    youtube_video_id: raw.youtube_video_id || null,
    published_at: new Date(raw.published_at),
    scraped_at: new Date(raw.scraped_at),
    source_name: source.name,
    source_url: source.url,
  };
}

/** Normalize an array of raw Supabase rows into ArticleData[] */
export function normalizeArticles(rawData: any[] | null): ArticleData[] {
  return (rawData || []).map(normalizeArticle);
}

/** Map ArticleData to the props expected by ArticleCard / Featured components */
export function mapArticleToProps(article: ArticleData) {
  return {
    image: article.image_url || "/images/placeholder-image.webp",
    // Public-facing headline: SEO title when present, original title as fallback.
    title: article.seo_title || article.title,
    date: formatDate(article.published_at.toISOString()),
    excerpt: article.excerpt,
    source: article.source_name,
    category: article.category,
    href: getContentUrl(article.slug, article.content_type),
    contentType: article.content_type,
    identifier: article.id,
    articleId: article.id,
    articleSlug: article.slug,
    scraped_at: article.scraped_at.toISOString(),
  };
}

/** Extract unique available category slugs from raw Supabase category rows */
export function getAvailableCategorySlugs(categoryRows: any[] | null): string[] {
  return Array.from(
    new Set(
      (categoryRows || [])
        .map((r: any) => r.category)
        .filter(Boolean)
        .map((name: string) => getCategorySlugByName(name))
        .filter((slug: string | undefined) => slug !== undefined) as string[]
    )
  );
}

/** Minimum age (days) an archived article must have before it can be hard-deleted.
 *  Prevents resurrection: the scraper re-inserts any URL still present in the source feed.
 *  After 30 days URLs have rolled off their feeds, so deletion is safe. (ADR-003) */
export const ARCHIVED_DELETE_MIN_AGE_DAYS = 30;

/** Returns true if an archived article is eligible for hard-deletion (published >30 days ago). */
export function isDeletableArchived(item: { archived: boolean; published_at: string }): boolean {
  if (!item.archived) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVED_DELETE_MIN_AGE_DAYS);
  return new Date(item.published_at) < cutoff;
}

/**
 * Serialize article data for bookmark storage.
 * Returns a JSON string matching the BookmarkEntry shape, or empty string if no id.
 */
export function serializeBookmarkData(props: {
  id?: string;
  slug?: string;
  title: string;
  excerpt: string;
  image: string;
  scraped_at?: string;
  source: string;
  category: string;
  contentType?: string;
}): string {
  if (!props.id) return "";
  return JSON.stringify({
    id: props.id,
    slug: props.slug || "",
    title: props.title,
    excerpt: stripHtml(props.excerpt),
    image_url: props.image,
    scraped_at: props.scraped_at || "",
    source_name: props.source,
    category: props.category,
    content_type: props.contentType || "news",
    savedAt: "",
  });
}
