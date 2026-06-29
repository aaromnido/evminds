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

export async function getOwnArticles(): Promise<OwnArticle[]> {
  const now = new Date();

  // The hand-written Database type makes .from() infer `never`, hence the
  // localized cast.
  const { data } = await supabase
    .from("posts")
    .select("title, excerpt, image_url, image_alt, author, category, tags, slug, published_at");
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

  // Newest first.
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}
