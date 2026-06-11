import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * POST /admin/logout — clears the Supabase session and returns to login.
 * POST (not GET) so a link prefetch or image-style request can't log the
 * admin out. Triggered by the logout button's form in the admin shell.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient({ request, cookies });
  await supabase.auth.signOut();
  return redirect("/admin/login");
};
