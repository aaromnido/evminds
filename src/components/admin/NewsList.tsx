import { Newspaper, Search, X } from "lucide-react";
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
    <div className="flex flex-col gap-4">
      {/* Filters + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <a
              key={f.key}
              href={buildUrl({ estado: f.key, q })}
              className={cn(
                buttonVariants({
                  variant: estado === f.key ? "default" : "outline",
                  size: "sm",
                }),
              )}
            >
              {f.label}
            </a>
          ))}
        </div>

        <form method="GET" className="flex items-center gap-2">
          {estado !== "activas" && (
            <input type="hidden" name="estado" value={estado} />
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por título…"
              className="w-64 pl-9 pr-9"
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
                  <TableHead>Título</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Publicado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id} className={a.archived ? "opacity-60" : undefined}>
                    <TableCell className="max-w-md font-medium">
                      <span className="line-clamp-2">{a.title}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.source?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.category}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.content_type === "video" && (
                          <Badge variant="outline">Vídeo</Badge>
                        )}
                        {a.archived && <Badge variant="secondary">Archivada</Badge>}
                        {!a.ai_summary && <Badge variant="outline">Sin IA</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(a.published_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/admin/noticias/${a.id}/edit`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Editar
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} noticia{total === 1 ? "" : "s"} · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <a
                href={buildUrl({ estado, q, page: page - 1 })}
                aria-disabled={page <= 1}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page <= 1 && "pointer-events-none opacity-50",
                )}
              >
                Anterior
              </a>
              <a
                href={buildUrl({ estado, q, page: page + 1 })}
                aria-disabled={page >= totalPages}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  page >= totalPages && "pointer-events-none opacity-50",
                )}
              >
                Siguiente
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
