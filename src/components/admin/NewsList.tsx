import { ChevronLeft, ChevronRight, Edit, Newspaper, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";

export interface NewsListItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  content_type: string;
  published_at: string;
  archived: boolean;
  ai_summary: string | null;
  source: { name: string } | null;
}

/** The four list views; kept in sync with the .astro server-side filter. */
const FILTERS = [
  { key: "activas", label: "Activas" },
  { key: "archivadas", label: "Archivadas" },
  { key: "sin-ia", label: "Sin IA" },
  { key: "todas", label: "Todas" },
] as const;

interface Props {
  items: NewsListItem[];
  error?: string;
  q: string;
  estado: string;
  page: number;
  totalPages: number;
  total: number;
}

/** Build a /admin/noticias URL preserving the other params. */
function buildUrl(params: { estado?: string; q?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.estado && params.estado !== "activas") sp.set("estado", params.estado);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/noticias?${qs}` : "/admin/noticias";
}

export default function NewsList({
  items,
  error,
  q,
  estado,
  page,
  totalPages,
  total,
}: Props) {
  return (
    <div className="flex flex-col gap-4" data-list-region>
      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {/* Segmented control: joined outline buttons, active one filled. */}
        <div className="flex w-full justify-center sm:inline-flex sm:w-auto" role="group" aria-label="Filtrar noticias">
          {FILTERS.map((f, i) => (
            <a
              key={f.key}
              href={buildUrl({ estado: f.key, q })}
              aria-current={estado === f.key ? "true" : undefined}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "rounded-none focus-visible:z-10",
                i === 0 && "rounded-l-md",
                i === FILTERS.length - 1 && "rounded-r-md",
                i > 0 && "-ml-px",
                estado === f.key &&
                  "z-10 border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background",
              )}
            >
              {f.label}
            </a>
          ))}
        </div>

        <form method="GET" className="order-first flex flex-1 items-center gap-2 sm:order-none">
          {estado !== "activas" && (
            <input type="hidden" name="estado" value={estado} />
          )}
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por título…"
              className="w-full pl-9 pr-9"
            />
            {q && (
              <a
                href={buildUrl({ estado })}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </a>
            )}
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-4" data-list-content>
      {error ? (
        <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No se pudieron cargar las noticias: {error}
        </p>
      ) : items.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
          <Newspaper
            className="mb-4 size-16 text-muted-foreground/40"
            strokeWidth={1}
          />
          <p className="text-base text-muted-foreground">
            {q
              ? `Sin resultados para “${q}”.`
              : "No hay noticias en esta vista."}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full min-w-[60vw] md:min-w-0">Título</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead>Publicado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className={a.archived ? "opacity-60" : undefined}>
                    <TableCell className="max-w-0 min-w-[60vw] font-medium md:min-w-0">
                      <span className="block truncate" title={a.title}>
                        {a.title}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.source?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {a.category}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {a.content_type === "video" && (
                          <Badge variant="outline" className="h-6 px-3 py-1">Vídeo</Badge>
                        )}
                        {a.archived && <Badge variant="secondary" className="h-6 px-3 py-1">Archivada</Badge>}
                        {!a.ai_summary && <Badge variant="default" className="h-6 px-3 py-1">Sin IA</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(a.published_at)}
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap pr-4 text-center">
                      <a
                        href={`/admin/noticias/${a.id}/edit`}
                        aria-label="Editar noticia"
                        title="Editar"
                        className={buttonVariants({ variant: "outline", size: "icon" })}
                      >
                        <Edit className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-nowrap">
            <a
              href={buildUrl({ estado, q, page: page - 1 })}
              aria-disabled={page <= 1}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-2",
                page <= 1 && "pointer-events-none opacity-50",
              )}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </a>
            <span className="order-first w-full text-center sm:order-none sm:w-auto sm:text-left">
              {total} noticia{total === 1 ? "" : "s"} · página {page} de {totalPages}
            </span>
            <a
              href={buildUrl({ estado, q, page: page + 1 })}
              aria-disabled={page >= totalPages}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-2",
                page >= totalPages && "pointer-events-none opacity-50",
              )}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </a>
          </div>
        </>
      )}
      </div>

      {/* Ghost: shown only while a View Transition is loading the next page
          (toggled via [data-loading] on the region; see global.css). */}
      <div data-list-skeleton aria-hidden="true">
        <NewsListSkeleton />
      </div>
    </div>
  );
}

/** Skeleton mirroring the news table (same columns + responsive hiding). */
function NewsListSkeleton() {
  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full min-w-[50vw] md:min-w-0">Título</TableHead>
            <TableHead>Medio</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead className="hidden md:table-cell">Estado</TableHead>
            <TableHead>Publicado</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="max-w-0 min-w-[50vw] md:min-w-0">
                <Skeleton className="h-4 w-[70%]" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-6 w-20 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="w-px whitespace-nowrap pr-4">
                <Skeleton className="size-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
