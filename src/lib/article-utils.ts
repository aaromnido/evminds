import { formatDate } from "@/lib/date-utils";
import { getArticleUrl } from "@/lib/article-url";
import { getCategorySlugByName } from "@/lib/categories";
import type { ArticleData } from "@/loaders/supabase-loader";

/** Number of articles loaded on initial page render (index + category pages) */
export const INITIAL_ARTICLES_LIMIT = 24;

/** Default number of articles per API pagination request */
export const API_DEFAULT_LIMIT = 12;

/** Shared Supabase select fields for article listings with source join */
export const ARTICLE_SELECT =
  "id, slug, title, excerpt, image_url, article_url, category, published_at, scraped_at, source:sources!inner(name, url)";

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
    excerpt: raw.excerpt,
    image_url: raw.image_url,
    article_url: raw.article_url,
    category: raw.category,
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
    title: article.title,
    date: formatDate(article.published_at.toISOString()),
    excerpt: article.excerpt,
    source: article.source_name,
    category: article.category,
    href: getArticleUrl(article.slug),
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
}): string {
  if (!props.id) return "";
  return JSON.stringify({
    id: props.id,
    slug: props.slug || "",
    title: props.title,
    excerpt: props.excerpt,
    image_url: props.image,
    scraped_at: props.scraped_at || "",
    source_name: props.source,
    category: props.category,
    savedAt: "",
  });
}
