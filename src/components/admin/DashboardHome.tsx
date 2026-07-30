import { Newspaper, Video, FileText, Plus, ArrowRight, Sparkles, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import { getPostStatusBadge } from "@/lib/post-status";

export interface RecentNewsItem {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  scraped_at: string;
}

export interface RecentPostItem {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
}

interface Props {
  newsTotal: number;
  /** Recently-scraped news (7d) still missing an AI summary — pipeline health. */
  newsNoAiRecent: number;
  newsArchived: number;
  postsTotal: number;
  postsDrafts: number;
  lastScrapeIso: string | null;
  recentNews: RecentNewsItem[];
  recentPosts: RecentPostItem[];
  nowIso: string;
}

/** One stat tile. Optional `href` turns the value into an actionable link. */
function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
          <span className="text-muted-foreground">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "warning" && value !== 0 && "text-amber-500",
          )}
        >
          {value}
        </span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardHome({
  newsTotal,
  newsNoAiRecent,
  newsArchived,
  postsTotal,
  postsDrafts,
  lastScrapeIso,
  recentNews,
  recentPosts,
  nowIso,
}: Props) {
  const now = new Date(nowIso).getTime();

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Noticias"
          value={newsTotal.toLocaleString("es-ES")}
          hint={`${newsArchived} archivadas`}
          icon={<Newspaper />}
        />
        <Kpi
          label="Sin IA · 7 días"
          value={newsNoAiRecent}
          tone="warning"
          icon={<Sparkles />}
          hint={
            newsNoAiRecent > 0 ? (
              <a
                href="/admin/noticias?estado=sin-ia"
                className="text-amber-600 underline-offset-4 hover:underline dark:text-amber-500"
              >
                Revisar pendientes →
              </a>
            ) : (
              "Pipeline al día"
            )
          }
        />
        <Kpi
          label="Artículos propios"
          value={postsTotal}
          hint={`${postsDrafts} ${postsDrafts === 1 ? "borrador" : "borradores"}`}
          icon={<FileText />}
        />
        <Kpi
          label="Última captura"
          value={lastScrapeIso ? formatRelativeTime(lastScrapeIso) : "—"}
          hint="Actividad del scraper"
          icon={<Clock />}
        />
      </div>

      {/* Section cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Noticias</CardTitle>
            <CardDescription>
              Editar, archivar y regenerar la IA de las noticias agregadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <span className="font-medium text-foreground">{newsTotal.toLocaleString("es-ES")}</span>{" "}
            en total · {newsArchived} archivadas
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button className="w-full sm:w-auto" render={<a href="/admin/noticias" />}>
              Gestionar noticias
              <ArrowRight />
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              render={<a href="/admin/noticias/new" />}
            >
              <Plus />
              Nueva noticia
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Artículos propios</CardTitle>
            <CardDescription>Crear y editar el contenido original (tabla posts).</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <span className="font-medium text-foreground">{postsTotal}</span> en total ·{" "}
            {postsDrafts} {postsDrafts === 1 ? "borrador" : "borradores"}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button className="w-full sm:w-auto" render={<a href="/admin/articulos" />}>
              Gestionar artículos
              <ArrowRight />
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              render={<a href="/admin/articulos/new" />}
            >
              <Plus />
              Nuevo artículo
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas noticias capturadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {recentNews.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nada todavía.</p>
            ) : (
              recentNews.map((n) => (
                <a
                  key={n.id}
                  href={`/admin/noticias/${n.id}/edit`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted"
                >
                  <span className="text-muted-foreground">
                    {n.content_type === "video" ? (
                      <Video className="size-4" />
                    ) : (
                      <Newspaper className="size-4" />
                    )}
                  </span>
                  <span className="line-clamp-1 flex-1 text-sm">{n.title}</span>
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(n.scraped_at)}
                  </span>
                </a>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos artículos editados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {recentPosts.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nada todavía.</p>
            ) : (
              recentPosts.map((p) => {
                const s = getPostStatusBadge(p.status, p.published_at, now);
                return (
                  <a
                    key={p.id}
                    href={`/admin/articulos/${p.id}/edit`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted"
                  >
                    <span className="line-clamp-1 flex-1 text-sm">{p.title}</span>
                    <Badge variant={s.variant} className={cn("shrink-0", s.className)}>
                      <span className={cn("size-1.5 shrink-0 rounded-full", s.dotClass)} />
                      {s.label}
                    </Badge>
                    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {formatRelativeTime(p.updated_at)}
                    </span>
                  </a>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
