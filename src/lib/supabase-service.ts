import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-only Supabase client using the SERVICE-ROLE key. It BYPASSES RLS, so it
 * must NEVER be imported into client-side code (the key is not PUBLIC_-prefixed).
 *
 * Sole use today: draft previews on /articulo/{slug}?preview, where an anonymous
 * link-bearer needs to read an unpublished/scheduled post that RLS would hide.
 * Lazily constructed so the normal (non-preview) render never touches it and a
 * missing key only fails when a preview is actually requested.
 */
let client: SupabaseClient<Database> | null = null;

export function getSupabaseService(): SupabaseClient<Database> {
  if (client) return client;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  // import.meta.env in dev/build, process.env for Netlify runtime-only secrets.
  const key =
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ??
    (typeof process !== "undefined"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : undefined);

  if (!url || !key) {
    throw new Error(
      "Missing Supabase service-role env vars (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
