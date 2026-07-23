import { defineMiddleware } from "astro:middleware";
import type { APIContext } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { hasSupabaseAuthCookie } from "@/lib/admin-session";
import { hasPrefsCookie } from "@/lib/preferences";
import { decideCacheHeaders } from "@/lib/cache-policy";

const LOGIN_PATH = "/admin/login";

// Supabase's auth cookie name embeds the project ref (`sb-<ref>-auth-token`).
// Derived from the env var (not hardcoded) so this keeps working if the
// Supabase project ever changes — computed once at module load, since the URL
// is a build-time/static env var, not a per-request value.
const AUTH_COOKIE_BASE_NAME = `sb-${new URL(import.meta.env.PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

/**
 * Applies edge/browser cache headers to public (non-/admin) responses, per the
 * route→policy table in cache-policy.ts (the actual decision logic — kept
 * there as a pure function so it's unit-testable without an Astro request).
 *
 * Default-deny: a non-200 response (redirects, 404s, errors) or a route the
 * policy doesn't recognize gets no headers at all — identical to today's
 * (uncached) behavior. Never touches Set-Cookie or any other response header.
 *
 * Skips prerendered routes (Group C statics): they're static files with no
 * per-request headers of their own, and `context.request.headers` isn't
 * available for them at build time (Astro warns if it's read regardless).
 */
function applyCacheHeaders(context: APIContext, response: Response): Response {
  if (response.status !== 200 || context.isPrerendered) return response;

  const cookieHeader = context.request.headers.get("Cookie");
  const headers = decideCacheHeaders({
    pathname: context.url.pathname,
    hasPrefsCookie: hasPrefsCookie(cookieHeader),
    hasAuthCookie: hasSupabaseAuthCookie(cookieHeader),
    isPreview: context.url.searchParams.has("preview"),
    authCookieBaseName: AUTH_COOKIE_BASE_NAME,
  });

  if (headers) {
    for (const [name, value] of Object.entries(headers)) {
      response.headers.set(name, value);
    }
  }

  return response;
}

/**
 * Gates the /admin area. Public pages are untouched (early return), so there is
 * zero impact on the public site and no extra auth round-trips there.
 *
 * Auth uses getUser() — which verifies the JWT against the auth server — NOT
 * getSession(), which only reads the (forgeable) cookie. Authorization decisions
 * must rely on the verified identity.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith("/admin")) {
    return applyCacheHeaders(context, await next());
  }

  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = context.url.pathname === LOGIN_PATH;

  // Not authenticated: only the login page is reachable.
  if (!user) {
    return isLoginPage ? next() : context.redirect(LOGIN_PATH);
  }

  // Authenticated: verify the admin role. Reading the own profile row is
  // allowed by the profiles_self_read RLS policy (id = auth.uid()).
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = data?.role === "admin";

  // On the login page: admins go straight to the dashboard; a logged-in
  // non-admin stays to see the "forbidden" message (no redirect loop).
  if (isLoginPage) {
    return isAdmin ? context.redirect("/admin") : next();
  }

  // Any other /admin path requires admin.
  if (!isAdmin) {
    return context.redirect(`${LOGIN_PATH}?error=forbidden`);
  }

  // Expose the authed client + user to admin pages and API routes.
  context.locals.supabase = supabase;
  context.locals.user = user;
  return next();
});
