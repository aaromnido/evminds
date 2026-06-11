import { getCollection } from "astro:content";
import { supabase } from "@/lib/supabase";

/**
 * Unified own-content source: the `.md` collection + published `posts`.
 *
 * During the .md → posts transition both sources coexist; `.md` wins on a slug
 * collision (it's the source of truth for any not-yet-migrated article). After
 * Fase 5 the `.md` are gone and this returns posts only — same shape, same
 * ordering, so every consumer (listing, search, RSS, related) keeps working.
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

  // Source A: own markdown collection.
  const md: OwnArticle[] = (await getCollection("articulos"))
    .filter((a) => !a.data.draft && a.data.date <= now)
    .map((a) => ({
      title: a.data.title,
      excerpt: a.data.excerpt,
      image: a.data.image,
      imageAlt: a.data.imageAlt,
      date: a.data.date,
      author: a.data.author,
      category: a.data.category,
      tags: a.data.tags,
      slug: a.id,
    }));

  // Source B: published posts. The hand-written Database type makes .from()
  // infer `never`, hence the localized cast (see .claude/tasks/typecheck-cleanup.md).
  const { data } = await supabase
    .from("posts")
    .select(
      "title, excerpt, image_url, image_alt, author, category, tags, slug, published_at",
    );
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

  // .md wins on slug collision; newest first.
  const mdSlugs = new Set(md.map((a) => a.slug));
  return [...md, ...posts.filter((p) => !mdSlugs.has(p.slug))].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}
