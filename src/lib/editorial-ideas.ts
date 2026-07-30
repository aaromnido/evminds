/**
 * The curator's idea bank: row↔type mapping and the read helpers step ① needs
 * for its "Guardadas y propias" and "Ya escritas o caducadas" sections (task
 * A3, phase 5). See migration 54 for the persistence model.
 *
 * "Propuestas de hoy" (status `pending`) is deliberately NOT read here — that
 * batch may require a live Gemini call, so it goes through the
 * `curate-ideas.ts` proxy instead. This module only covers the durable rows:
 * saved, own, picked and expired.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { IdeaCandidate, IdeaOrigin, IdeaStatus } from "./editorial-types";

type CandidateRow = Database["public"]["Tables"]["editorial_candidates"]["Row"];

export function mapCandidateRow(row: CandidateRow): IdeaCandidate {
  return {
    id: row.id,
    origin: row.origin as IdeaOrigin,
    source_url: row.source_url,
    source_title: row.source_title,
    source_name: row.source_name,
    source_excerpt: row.source_excerpt,
    proposed_title_es: row.proposed_title_es,
    angle: row.angle,
    rationale: row.rationale,
    reference_urls: row.reference_urls,
    status: row.status as IdeaStatus,
    fetched_at: row.fetched_at,
    picked_at: row.picked_at,
    // NULL in the DB for anything that isn't `pending` (see migration 54) —
    // falling back to fetched_at keeps the type's non-null contract without
    // inventing a real expiry. IdeaCardMeta never renders it outside `pending`.
    expires_at: row.expires_at ?? row.fetched_at,
  };
}

/** "Guardadas y propias": every saved idea, curator-sourced or Fer's own. */
export async function fetchKeptIdeas(supabase: SupabaseClient<Database>): Promise<IdeaCandidate[]> {
  const { data } = await supabase
    .from("editorial_candidates")
    .select("*")
    .eq("status", "saved")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapCandidateRow);
}

/** "Ya escritas o caducadas": picked ideas plus batches that expired unsaved. */
export async function fetchIdeaHistory(
  supabase: SupabaseClient<Database>,
  limit = 30,
): Promise<IdeaCandidate[]> {
  const { data } = await supabase
    .from("editorial_candidates")
    .select("*")
    .in("status", ["picked", "expired"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapCandidateRow);
}
