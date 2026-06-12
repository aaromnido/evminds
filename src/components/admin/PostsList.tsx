import { ChevronLeft, ChevronRight, Edit, FilePenLine, Plus, Search, X } from "lucide-react";
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

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  category: string;
}

interface Props {
  posts: PostListItem[];
  error?: string;
  /** ISO string of "now" computed server-side (avoids client/server clock drift). */
  nowIso: string;
  q: string;
  page: number;
  totalPages: number;
  total: number;
}

function pageUrl(p: number, q: string) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (p > 1) sp.set("page", String(p));
  const qs = sp.toString();
  return qs ? `/admin/posts?${qs}` : "/admin/posts";
}

type StatusVariant = "default" | "secondary" | "outline";

interface StatusBadge {
  label: string;
  variant: StatusVariant;
  /** Tailwind color class for the leading dot. */
  dotClass: string;
  /** Extra classes appended to the badge (e.g. a custom border). */
  className?: string;
}

function statusBadge(
  status: string,
  publishedAt: string | null,
  now: number,
): StatusBadge {
  if (status === "draft") {
    return {
      label: "Borrador",
      variant: "secondary",
      dotClass: "bg-orange-500",
      // Darker gray border so the badge stands out from its light background.
      className: "border-muted-foreground/35",
    };
  }
  if (publishedAt && new Date(publishedAt).getTime() > now) {
    return { label: "Programado", variant: "outline", dotClass: "bg-blue-500" };
  }
  return { label: "Publicado", variant: "default", dotClass: "bg-green-500" };
}

export default function PostsList({
  posts,
  error,
  nowIso,
  q,
  page,
  totalPages,
  total,
}: Props) {
  const now = new Date(nowIso).getTime();

  return (
    <div data-list-region>
      <div data-list-content>
        <div className="flex flex-col gap-4">
          {/* Search */}
          <form method="GET" className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
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
                  href="/admin/posts"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </a>
              )}
            </div>
          </form>

          {error ? (
            <p className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              No se pudieron cargar los artículos: {error}
            </p>
          ) : posts.length === 0 ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
              <FilePenLine
                className="mb-4 size-16 text-muted-foreground/40"
                strokeWidth={1}
              />
              <p className="text-base text-muted-foreground">
                {q
                  ? `Sin resultados para "${q}".`
                  : "Aún no hay artículos propios."}
              </p>
              {!q && (
                <a
                  href="/admin/posts/new"
                  className={buttonVariants({ size: "lg", className: "mt-5" })}
                >
                  <Plus />
                  Crear el primero
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-full min-w-[60vw] md:min-w-0">Título</TableHead>
                      <TableHead className="hidden md:table-cell">Categoría</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p) => {
                      const s = statusBadge(p.status, p.published_at, now);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="max-w-0 min-w-[60vw] font-medium md:min-w-0">
                            <span className="block truncate" title={p.title}>
                              {p.title}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {p.category}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatShortDate(p.updated_at)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={s.variant}
                              // +2px vertical / +4px horizontal padding per side over
                              // the base (px-2 py-0.5, h-5); height bumped so the
                              // extra vertical padding is visible.
                              className={cn("h-6 gap-1.5 px-3 py-1", s.className)}
                            >
                              <span
                                className={cn(
                                  "size-1.5 shrink-0 rounded-full",
                                  s.dotClass,
                                )}
                              />
                              {s.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-px whitespace-nowrap pr-4 text-center">
                            <a
                              href={`/admin/posts/${p.id}/edit`}
                              aria-label="Editar artículo"
                              title="Editar"
                              className={buttonVariants({
                                variant: "outline",
                                size: "icon",
                              })}
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
                  href={pageUrl(page - 1, q)}
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
                  {total} artículo{total === 1 ? "" : "s"} · página {page} de{" "}
                  {totalPages}
                </span>
                <a
                  href={pageUrl(page + 1, q)}
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
      </div>

      {/* Ghost: shown only while a View Transition is loading the next page
          (toggled via [data-loading] on the region; see global.css). */}
      <div data-list-skeleton aria-hidden="true">
        <PostsListSkeleton />
      </div>
    </div>
  );
}

/** Skeleton mirroring the posts table (same columns + responsive hiding). */
function PostsListSkeleton() {
  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full min-w-[60vw] md:min-w-0">Título</TableHead>
            <TableHead className="hidden md:table-cell">Categoría</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="max-w-0">
                <Skeleton className="h-4 w-[70%]" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-24 rounded-full" />
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
