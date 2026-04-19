import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { supabase } from "@/lib/supabase";
import { getNewsUrl, getArticleUrl } from "@/lib/article-url";

const RSS_ARTICLES_LIMIT = 50;

export async function GET(context: APIContext) {
  const { data: newsArticles } = await supabase
    .from("articles")
    .select("title, excerpt, slug, published_at, category")
    .order("scraped_at", { ascending: false })
    .limit(RSS_ARTICLES_LIMIT);

  const now = new Date();
  const ownArticles = (await getCollection("articulos"))
    .filter((a) => !a.data.draft && a.data.date <= now)
    .map((a) => ({
      title: a.data.title,
      description: a.data.excerpt,
      link: getArticleUrl(a.id),
      pubDate: a.data.date,
      categories: [a.data.category],
    }));

  const newsItems = (newsArticles || []).map((article: any) => ({
    title: article.title,
    description: article.excerpt,
    link: getNewsUrl(article.slug),
    pubDate: new Date(article.published_at),
    categories: article.category ? [article.category] : [],
  }));

  const allItems = [...ownArticles, ...newsItems]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "EVMinds — Movilidad Eléctrica",
    description:
      "Noticias, artículos y experiencias sobre movilidad eléctrica en español. Coches eléctricos, baterías, energías renovables e infraestructura de carga.",
    site: context.site!.toString(),
    items: allItems,
    customData: "<language>es</language>",
  });
}
