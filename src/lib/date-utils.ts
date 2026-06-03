/**
 * Format ISO timestamp to Spanish locale date string
 * @example formatDate("2024-01-20T10:30:00Z") → "20 de enero de 2024"
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Format ISO timestamp to a short numeric Spanish date (compact, for dense lists)
 * @example formatShortDate("2026-01-20T10:30:00Z") → "20/01/2026"
 */
export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Format ISO timestamp to relative time in Spanish
 * @example formatRelativeTime("2024-01-20T10:30:00Z") → "hace 2 días"
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
  return `hace ${Math.floor(diffDays / 365)} años`;
}
