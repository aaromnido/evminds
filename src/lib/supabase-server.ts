import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

// Same env vars as the anon singleton (src/lib/supabase.ts). PUBLIC_SUPABASE_ANON_KEY
// holds the publishable key — safe to expose, RLS still applies.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local configuration.");
}

/**
 * Per-request, cookie-bound Supabase client for SSR auth.
 *
 * Unlike the anon singleton in supabase.ts, this client reads/writes the user's
 * session from cookies, so RLS `auth.uid()` / `is_admin()` resolve to the
 * logged-in admin. Admin writes run through this client and are validated by
 * RLS (defense in depth — see ADR-008). Create one PER REQUEST; never share it
 * across requests.
 */
export function createSupabaseServerClient({
  request,
  cookies,
}: {
  request: Request;
  cookies: AstroCookies;
}) {
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        // parseCookieHeader may yield `value: undefined`; coerce to "" to
        // satisfy the getAll() return type.
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(({ name, value }) => ({
          name,
          value: value ?? "",
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
      },
    },
  });
}
