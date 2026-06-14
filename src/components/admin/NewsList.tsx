import { useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Loader2, Newspaper, Search, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import { isDeletableArchived } from "@/lib/article-utils";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const eligibleItems = items.filter(isDeletableArchived);
  const eligibleIds = eligibleItems.map((a) => a.id);
  const allEligibleSelected =
    eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allEligibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        eligibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...eligibleIds]));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(opts: { ids?: string[]; all?: boolean }) {
    setDeleting(true);
    setDeleteError(null);
    try {
      const body = opts.all ? { all: true } : { ids: opts.ids };
      const res = await fetch("/admin/noticias/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDeleteError(data.error ?? "Error al eliminar.");
      } else {
        window.location.reload();
      }
    } catch {
      setDeleteError("Error de red. Inténtalo de nuevo.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4" data-list-region>
        {/* Filters + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Segmented control */}
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
                  ? `Sin resultados para "${q}".`
                  : "No hay noticias en esta vista."}
              </p>
            </div>
          ) : (
            <>
              {/* Bulk action bar */}
              <div className="flex min-h-[36px] flex-wrap items-center justify-between gap-2">
                {someSelected ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {selected.size} seleccionada{selected.size !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {deleteError && (
                        <p className="text-sm text-destructive">{deleteError}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(new Set())}
                        disabled={deleting}
                      >
                        Cancelar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="destructive" size="sm" disabled={deleting}>
                              {deleting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              {deleting ? "Eliminando…" : `Eliminar (${selected.size})`}
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar {selected.size} noticia{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción es permanente y no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleDelete({ ids: [...selected] })}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                ) : estado === "archivadas" && eligibleItems.length > 0 ? (
                  <div className="ml-auto">
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="destructive" size="sm" disabled={deleting}>
                            {deleting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            {deleting ? "Eliminando…" : "Eliminar todas las archivadas antiguas"}
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar todas las archivadas antiguas?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminarán permanentemente todas las noticias archivadas con más de 30 días. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete({ all: true })}
                          >
                            Eliminar todas
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-px pr-0">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todas las elegibles"
                          checked={allEligibleSelected}
                          disabled={eligibleIds.length === 0}
                          onChange={toggleAll}
                          className="size-4 cursor-pointer accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </TableHead>
                      <TableHead className="w-full min-w-[60vw] md:min-w-0">Título</TableHead>
                      <TableHead>Medio</TableHead>
                      <TableHead className="hidden md:table-cell">Categoría</TableHead>
                      <TableHead className="hidden md:table-cell">Estado</TableHead>
                      <TableHead>Publicado</TableHead>
                      <TableHead className="w-px" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((a) => {
                      const eligible = isDeletableArchived(a);
                      const isSelected = selected.has(a.id);
                      return (
                        <TableRow key={a.id} className={a.archived ? "opacity-60" : undefined}>
                          <TableCell className="pr-0">
                            {eligible ? (
                              <input
                                type="checkbox"
                                aria-label={`Seleccionar "${a.title}"`}
                                checked={isSelected}
                                onChange={() => toggleOne(a.id)}
                                className="size-4 cursor-pointer accent-foreground"
                              />
                            ) : (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <span className="inline-flex">
                                      <input
                                        type="checkbox"
                                        aria-label={`Seleccionar "${a.title}"`}
                                        disabled
                                        checked={false}
                                        onChange={() => {}}
                                        className="size-4 cursor-not-allowed opacity-30"
                                      />
                                    </span>
                                  }
                                />
                                <TooltipContent>
                                  Solo se pueden eliminar archivadas con más de 30 días
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
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
                      );
                    })}
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

        {/* Ghost: shown only while a View Transition is loading the next page */}
        <div data-list-skeleton aria-hidden="true">
          <NewsListSkeleton />
        </div>
      </div>
    </TooltipProvider>
  );
}

/** Skeleton mirroring the news table (same columns + responsive hiding). */
function NewsListSkeleton() {
  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-px" />
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
              <TableCell className="w-px pr-0">
                <Skeleton className="size-4" />
              </TableCell>
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
