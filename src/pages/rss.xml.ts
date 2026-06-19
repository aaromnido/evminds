import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { supabase } from "@/lib/supabase";
import { getNewsUrl, getArticleUrl } from "@/lib/article-url";
import { getOwnArticles } from "@/lib/own-articles";
import { stripHtml } from "@/lib/html-utils";

const RSS_ARTICLES_LIMIT = 50;

export async function GET(context: APIContext) {
  const { data: newsArticles } = await supabase
    .from("articles")
    .select("title, seo_title, excerpt, slug, published_at, category")
    .order("scraped_at", { ascending: false })
    .limit(RSS_ARTICLES_LIMIT);

  const ownArticles = (await getOwnArticles()).map((a) => ({
    title: a.title,
    description: stripHtml(a.excerpt),
    link: getArticleUrl(a.slug),
    pubDate: a.date,
    categories: [a.category],
  }));

  const newsItems = (newsArticles || []).map((article: any) => ({
    title: article.seo_title || article.title,
    description: stripHtml(article.excerpt),
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
