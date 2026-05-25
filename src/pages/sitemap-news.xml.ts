import type { APIContext } from "astro";
import { supabase } from "@/lib/supabase";
import { getNewsUrl } from "@/lib/article-url";

export async function GET(context: APIContext) {
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, published_at")
    .order("scraped_at", { ascending: false });

  const urls = (articles || [])
    .map(
      (a: any) => `
  <url>
    <loc>${new URL(getNewsUrl(a.slug), context.site).toString()}</loc>
    <lastmod>${new Date(a.published_at).toISOString().split("T")[0]}</lastmod>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
