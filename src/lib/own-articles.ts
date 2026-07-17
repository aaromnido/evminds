import { supabase } from "@/lib/supabase";

/**
 * Own-content source: published `posts`. Own articles live in the DB now; the
 * legacy `.md` collection was retired after the .md → posts migration. Same
 * shape and ordering, so every consumer (listing, search, RSS, related) keeps
 * working.
 *
 * RLS (`posts_public_read`) limits the posts query to published & due rows.
 */
export interface OwnArticle {
  title: string;
  excerpt: string;
  image?: string;
  imageAlt?: string;
  date: Date;
  author: string;
  category: string;
  tags: string[];
  slug: string;
}

// A10 newsletter exclusivity window: gated callers hide own articles newer
// than this from discovery surfaces, while the direct URL keeps working —
// see .claude/tasks/newsletter.md, "Phase 1: ready to execute".
const GATING_HOURS = 48;

/**
 * Fetch published own-content articles (tabla posts), newest first.
 *
 * @param options.limit - Maximum number of articles to return. Defaults to
 *   100 (preventive cap so a future surge in own content doesn't load the
 *   entire table into memory on every call). Callers that need all articles
 *   for scoring/matching (e.g. related-articles in articulo/[slug].astro) can
 *   pass a higher limit or omit it. RLS (`posts_public_read`) limits the
 *   query to published & due rows.
 * @param options.gated - When true, excludes articles published within the
 *   last GATING_HOURS (A10 newsletter exclusivity). Only discovery surfaces
 *   (home, /articulo listing, articulo related-articles, site search) opt
 *   in; rss.xml deliberately stays ungated (accepted low-risk leak path).
 */
export async function getOwnArticles(
  options: { limit?: number; gated?: boolean } = {},
): Promise<OwnArticle[]> {
  const { limit = 100, gated = false } = options;
  const now = new Date();

  // The hand-written Database type makes .from() infer `never`, hence the
  // localized cast.
  let query = supabase
    .from("posts")
    .select("title, excerpt, image_url, image_alt, author, category, tags, slug, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (gated) {
    const cutoff = new Date(now.getTime() - GATING_HOURS * 60 * 60 * 1000).toISOString();
    query = query.lt("published_at", cutoff);
  }

  const { data } = await query;
  const posts: OwnArticle[] = (
    (data ?? []) as unknown as {
      title: string;
      excerpt: string;
      image_url: string | null;
      image_alt: string | null;
      author: string;
      category: string;
      tags: string[] | null;
      slug: string;
      published_at: string | null;
    }[]
  ).map((p) => ({
    title: p.title,
    excerpt: p.excerpt,
    image: p.image_url ?? undefined,
    imageAlt: p.image_alt ?? undefined,
    date: p.published_at ? new Date(p.published_at) : now,
    author: p.author,
    category: p.category,
    tags: p.tags ?? [],
    slug: p.slug,
  }));

  // The query already orders by published_at DESC, but published_at can be null
  // (drafts published without a date get `now` above). Re-sort to guarantee
  // newest-first regardless of how Supabase handled nulls in the ORDER BY.
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}
