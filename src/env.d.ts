/// <reference path="../.astro/types.d.ts" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./lib/database.types";

declare global {
  namespace App {
    interface Locals {
      // Set by middleware on authenticated /admin requests only.
      supabase?: SupabaseClient<Database>;
      user?: User;
    }
  }
}

export {};
