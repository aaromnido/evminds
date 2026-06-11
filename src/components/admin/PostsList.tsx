import { FilePenLine, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
}

type StatusVariant = "default" | "secondary" | "outline";

function statusBadge(
  status: string,
  publishedAt: string | null,
  now: number,
): { label: string; variant: StatusVariant } {
  if (status === "draft") return { label: "Borrador", variant: "secondary" };
  if (publishedAt && new Date(publishedAt).getTime() > now) {
    return { label: "Programado", variant: "outline" };
  }
  return { label: "Publicado", variant: "default" };
}

export default function PostsList({ posts, error, nowIso }: Props) {
  const now = new Date(nowIso).getTime();

  return (
    <>
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
            Aún no hay artículos propios.
          </p>
          <a
            href="/admin/posts/new"
            className={buttonVariants({ size: "lg", className: "mt-5" })}
          >
            <Plus />
            Crear el primero
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => {
                const s = statusBadge(p.status, p.published_at, now);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.category}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatShortDate(p.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={`/admin/posts/${p.id}/edit`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Editar
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
