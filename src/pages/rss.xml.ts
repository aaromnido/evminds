import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { supabase } from "@/lib/supabase";
import { getNewsUrl } from "@/lib/article-url";

const RSS_ARTICLES_LIMIT = 50;

export async function GET(context: APIContext) {
  const { data: articles } = await supabase
    .from("articles")
    .select("title, excerpt, slug, published_at, category")
    .order("scraped_at", { ascending: false })
    .limit(RSS_ARTICLES_LIMIT);

  return rss({
    title: "EVMinds — Noticias de Movilidad Eléctrica",
    description:
      "Agregador de noticias sobre movilidad eléctrica en español. Coches eléctricos, baterías, energías renovables e infraestructura de carga.",
    site: context.site!.toString(),
    items: (articles || []).map((article: any) => ({
      title: article.title,
      description: article.excerpt,
      link: getNewsUrl(article.slug),
      pubDate: new Date(article.published_at),
      categories: article.category ? [article.category] : [],
    })),
    customData: "<language>es</language>",
  });
}
