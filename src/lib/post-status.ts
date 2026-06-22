/**
 * Post (own-article) status → badge descriptor.
 *
 * Shared by the admin posts list and the admin dashboard so the "Borrador /
 * Programado / Publicado" labels, colors and dot stay identical everywhere.
 * Scheduling model (ADR-006): a published row with a future `published_at` is
 * "Programado"; past/now is "Publicado".
 */
export type PostStatusVariant = "default" | "secondary" | "outline";

export interface PostStatusBadge {
  label: string;
  variant: PostStatusVariant;
  /** Tailwind color class for the leading dot. */
  dotClass: string;
  /** Extra classes appended to the badge (e.g. a custom border). */
  className?: string;
}

export function getPostStatusBadge(
  status: string,
  publishedAt: string | null,
  now: number,
): PostStatusBadge {
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
