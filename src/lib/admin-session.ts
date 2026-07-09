import type { AstroCookies } from "astro";
import type { createSupabaseServerClient as CreateSupabaseServerClient } from "@/lib/supabase-server";

type SupabaseClientFactory = typeof CreateSupabaseServerClient;

// @supabase/ssr names auth cookies "sb-<project-ref>-auth-token", optionally
// chunked as "sb-<project-ref>-auth-token.0", ".1", etc. for large tokens.
const AUTH_COOKIE_PATTERN = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

/**
 * Cheap, non-authoritative check for whether a Supabase auth cookie is present.
 * This is a performance optimization only (skip the getUser() round-trip for
 * anonymous visitors) — it must never be used as an authorization decision.
 */
export function hasSupabaseAuthCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return AUTH_COOKIE_PATTERN.test(cookieHeader);
}

/**
 * Whether the current request belongs to a logged-in admin. Mirrors the auth
 * pattern in src/middleware.ts: getUser() (JWT-verified, never getSession())
 * followed by a profiles.role lookup. Returns false without any Supabase call
 * when no auth cookie is present.
 */
export async function isAdminRequest(
  { request, cookies }: { request: Request; cookies: AstroCookies },
  createClient?: SupabaseClientFactory,
): Promise<boolean> {
  if (!hasSupabaseAuthCookie(request.headers.get("Cookie"))) {
    return false;
  }

  // Lazily imported (rather than a static top-level import) so this module
  // stays load-safe without Supabase env vars — needed for unit tests, which
  // always inject a fake createClient and never reach this branch.
  const buildClient =
    createClient ?? (await import("@/lib/supabase-server")).createSupabaseServerClient;
  const supabase = buildClient({ request, cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}
