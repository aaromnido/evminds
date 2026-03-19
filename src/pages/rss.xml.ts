import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { supabase } from "@/lib/supabase";
import { getArticleUrl } from "@/lib/article-url";

export async function GET(context: APIContext) {
  const { data: articles } = await supabase
    .from("articles")
    .select("title, excerpt, slug, published_at, category")
    .order("scraped_at", { ascending: false })
    .limit(50);

  return rss({
    title: "EVMinds — Noticias de Movilidad Eléctrica",
    description:
      "Agregador de noticias sobre movilidad eléctrica en español. Coches eléctricos, baterías, energías renovables e infraestructura de carga.",
    site: context.site!.toString(),
    items: (articles || []).map((article) => ({
      title: article.title,
      description: article.excerpt,
      link: getArticleUrl(article.slug),
      pubDate: new Date(article.published_at),
      categories: article.category ? [article.category] : [],
    })),
    customData: "<language>es</language>",
  });
}
