import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const LOGIN_PATH = "/admin/login";

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
    return next();
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
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Cast: the hand-written Database type doesn't satisfy supabase-js's
  // GenericSchema, so .from() infers `never`. Localized workaround until the
  // type-check cleanup task fixes the root cause (.claude/tasks/typecheck-cleanup.md).
  const profile = data as { role: string } | null;
  const isAdmin = profile?.role === "admin";

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
