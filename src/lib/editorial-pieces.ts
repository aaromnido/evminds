/**
 * The list of pieces: turning stored rows into what the screen shows (task A3,
 * phase 2).
 *
 * The other half of "Guardar borrador". A piece that saves and cannot be found
 * again is not saved in any way that matters, so this is what makes the promise
 * true — and it is deliberately the same for the block on step ① and for the full
 * list, so the two can never describe the same piece differently.
 *
 * Pure functions, taking "now" as a parameter like the rest of the section: the
 * clock cannot be read inside a hydrated island.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChannelDraftStatus } from "./editorial-drafts";
import { orderChannels } from "./editorial-channels";
import type { Database } from "./database.types";
import type { PublishChannel } from "./editorial-types";

/** A piece is finished when every channel it was created for is closed. */
export type PieceStatus = "in_progress" | "done";

export interface PieceChannelSummary {
  channel: PublishChannel;
  /** `null` when the channel has no row yet: chosen in step ②, never written. */
  status: ChannelDraftStatus | null;
  publishDate: string | null;
}

export interface PieceSummary {
  id: string;
  /** What to call the piece now — see `buildPieceSummary`. */
  title: string;
  status: PieceStatus;
  updatedAt: string;
  channels: PieceChannelSummary[];
  /** Where "seguir escribiendo" lands. */
  href: string;
}

interface PieceRow {
  id: string;
  brief_title: string;
  status: string;
  updated_at: string;
  channels: string[];
}

interface DraftRow {
  piece_id: string;
  channel: string;
  status: string;
  publish_date: string | null;
  title: string;
}

/** Days without a change after which a piece is shown as stale. */
export const PIECE_STALE_DAYS = 30;

export function buildPieceSummary(piece: PieceRow, drafts: DraftRow[]): PieceSummary {
  const mine = drafts.filter((d) => d.piece_id === piece.id);
  const channels = orderChannels(piece.channels.filter(isChannel));

  const summaries: PieceChannelSummary[] = channels.map((channel) => {
    const row = mine.find((d) => d.channel === channel);
    return {
      channel,
      status: row ? (row.status as ChannelDraftStatus) : null,
      publishDate: row?.publish_date ?? null,
    };
  });

  // The headline wins over the brief once one exists: the brief title is what the
  // piece was called when it was an intention, and showing that after the
  // headline has been rewritten would make the list disagree with the screen it
  // links to.
  const written = channels.map((c) => mine.find((d) => d.channel === c)?.title).find(Boolean);

  return {
    id: piece.id,
    title: written || piece.brief_title,
    status: piece.status === "done" ? "done" : "in_progress",
    updatedAt: piece.updated_at,
    channels: summaries,
    href: resumeHref(piece.id, channels, summaries),
  };
}

/**
 * Where to pick a piece up: the first channel still open, and the last one when
 * they are all closed.
 *
 * Landing on a finished channel's screen is not a dead end — the piece stays
 * editable and reschedulable after the wizard closes, which is the requirement
 * that made all of this necessary.
 */
export function resumeHref(
  pieceId: string,
  channels: PublishChannel[],
  summaries: PieceChannelSummary[],
): string {
  const open = summaries.find((c) => c.status === null || c.status === "draft");
  const target = open?.channel ?? channels[channels.length - 1] ?? "motor";
  const params = new URLSearchParams({
    canales: channels.join(","),
    canal: target,
    pieza: pieceId,
  });
  return `/admin/redaccion/texto?${params}`;
}

/**
 * Whether a piece has gone untouched long enough to be worth flagging.
 *
 * Flagged, never deleted: an idea is a cheap suggestion, a piece is a written
 * article, and a rule that quietly destroys work is a far worse failure than a
 * long list. Same shape as the expiry bands in step ①, and the same reason it
 * takes "now" as an argument.
 */
export function isStalePiece(updatedAt: string, nowIso: string): boolean {
  const elapsed = new Date(nowIso).getTime() - new Date(updatedAt).getTime();
  return elapsed > PIECE_STALE_DAYS * 24 * 60 * 60 * 1000;
}

function isChannel(value: string): value is PublishChannel {
  return value === "motor" || value === "evminds";
}

/**
 * The pieces list, ready to render. Two round trips, in the page.
 *
 * Shared by the block on step ① and by the full list rather than written twice:
 * the two must never be able to describe the same piece differently, and the
 * ordering rule (most recently touched first) is part of that.
 */
export async function fetchPieceSummaries(
  supabase: SupabaseClient<Database>,
  options: { status?: PieceStatus; limit?: number } = {},
): Promise<{ pieces: PieceSummary[]; total: number }> {
  let query = supabase
    .from("editorial_pieces")
    .select("id, brief_title, status, updated_at, channels", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (options.status) query = query.eq("status", options.status);
  if (options.limit) query = query.limit(options.limit);

  const { data: rows, count, error } = await query;
  if (error || !rows?.length) return { pieces: [], total: count ?? 0 };

  const { data: drafts } = await supabase
    .from("editorial_channel_drafts")
    .select("piece_id, channel, status, publish_date, title")
    .in(
      "piece_id",
      rows.map((row) => row.id),
    );

  return {
    pieces: rows.map((row) => buildPieceSummary(row, drafts ?? [])),
    // The count is of the filtered query, so "ver todas (N)" says how many are
    // unfinished, not how many exist — which is what the link opens onto.
    total: count ?? rows.length,
  };
}
