import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Environment variables from .env.local
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check .env.local configuration.");
}

/**
 * Supabase client instance with type-safe database schema
 * Uses anon key for client-side operations (RLS applies)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
