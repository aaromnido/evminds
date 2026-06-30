import { describe, it, expect } from "vitest";
import {
  resolveToneLabel,
  resolveToneDescription,
  resolveToneColorVar,
  parseWindow,
  parseContentFilter,
  windowToSince,
  scoreFromCounts,
  colorFromScore,
  countsForFilter,
  rankSources,
  awardWinner,
  TONE_DEFINITIONS,
  TONE_UNCLASSIFIED,
  MIN_SAMPLE,
  type SourceToneCounts,
} from "./headline-tone";

/** Build a full RPC row with sensible defaults. */
function row(p: Partial<SourceToneCounts> & { source_id: string }): SourceToneCounts {
  return {
    source_name: p.source_id,
    n_green: 0,
    n_amber: 0,
    n_red: 0,
    n_total: 0,
    n_green_video: 0,
    n_amber_video: 0,
    n_red_video: 0,
    n_total_video: 0,
    ...p,
  };
}

describe("tone copy resolvers", () => {
  it("resolves label/description in es and en", () => {
    expect(resolveToneLabel("green", "es")).toBe(TONE_DEFINITIONS.green.label.es);
    expect(resolveToneLabel("green", "en")).toBe(TONE_DEFINITIONS.green.label.en);
    expect(resolveToneDescription("red", "en")).toBe(TONE_DEFINITIONS.red.description.en);
  });

  it("falls back to the unclassified copy for a null tone", () => {
    expect(resolveToneLabel(null)).toBe(TONE_UNCLASSIFIED.label.es);
    expect(resolveToneColorVar(null)).toBe(TONE_UNCLASSIFIED.colorVar);
  });

  it("returns the color var for a known tone", () => {
    expect(resolveToneColorVar("amber")).toBe(TONE_DEFINITIONS.amber.colorVar);
  });
});

describe("parseWindow / parseContentFilter", () => {
  it("accepts valid values", () => {
    expect(parseWindow("week")).toBe("week");
    expect(parseContentFilter("video")).toBe("video");
  });

  it("falls back to defaults for invalid or null values", () => {
    expect(parseWindow("nope")).toBe("year");
    expect(parseWindow(null)).toBe("year");
    expect(parseContentFilter(undefined)).toBe("all");
  });
});

describe("windowToSince", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("snaps 'year' to Jan 1 (UTC) of the current year", () => {
    expect(windowToSince("year", now)).toBe("2026-01-01T00:00:00.000Z");
  });

  it("rolls back 24 hours for '24h'", () => {
    expect(windowToSince("24h", now)).toBe("2026-06-14T12:00:00.000Z");
  });

  it("rolls back 7 days for 'week'", () => {
    expect(windowToSince("week", now)).toBe("2026-06-08T12:00:00.000Z");
  });

  it("rolls back 30 days for 'month'", () => {
    expect(windowToSince("month", now)).toBe("2026-05-16T12:00:00.000Z");
  });
});

describe("scoreFromCounts / colorFromScore", () => {
  it("returns 0 for an empty sample", () => {
    expect(scoreFromCounts(row({ source_id: "s" }))).toBe(0);
  });

  it("computes the weighted mean (green=0, amber=1, red=2)", () => {
    // (2*1 + 1*2) / 8 = 0.5
    expect(scoreFromCounts(row({ source_id: "s", n_green: 5, n_amber: 2, n_red: 1, n_total: 8 }))).toBe(
      0.5,
    );
  });

  it("maps scores to traffic-light colors at the boundaries", () => {
    expect(colorFromScore(0.5)).toBe("green");
    expect(colorFromScore(0.51)).toBe("amber");
    expect(colorFromScore(1.2)).toBe("amber");
    expect(colorFromScore(1.21)).toBe("red");
  });
});

describe("countsForFilter", () => {
  const full = row({
    source_id: "s",
    n_green: 10,
    n_amber: 4,
    n_red: 2,
    n_total: 16,
    n_green_video: 3,
    n_amber_video: 1,
    n_red_video: 1,
    n_total_video: 5,
  });

  it("returns totals as-is for 'all'", () => {
    expect(countsForFilter(full, "all").n_total).toBe(16);
  });

  it("isolates the video columns for 'video'", () => {
    const v = countsForFilter(full, "video");
    expect(v.n_total).toBe(5);
    expect(v.n_green).toBe(3);
  });

  it("subtracts video from totals for 'news'", () => {
    const n = countsForFilter(full, "news");
    expect(n.n_total).toBe(11);
    expect(n.n_green).toBe(7);
    expect(n.n_red).toBe(1);
  });
});

describe("rankSources / awardWinner", () => {
  it("ranks qualified (>= MIN_SAMPLE) sources above unqualified ones", () => {
    const honest = row({ source_id: "honest", n_green: MIN_SAMPLE, n_total: MIN_SAMPLE });
    const tiny = row({ source_id: "tiny", n_green: 1, n_total: 1 });
    const ranked = rankSources([tiny, honest]);
    expect(ranked[0].sourceId).toBe("honest");
    expect(ranked[0].enoughSample).toBe(true);
    expect(ranked[1].enoughSample).toBe(false);
    expect(ranked[1].score).toBeNull();
  });

  it("orders qualified sources by score (more honest first)", () => {
    const clean = row({ source_id: "clean", n_green: 10, n_total: 10 });
    const baity = row({ source_id: "baity", n_red: 10, n_total: 10 });
    const ranked = rankSources([baity, clean]);
    expect(ranked.map((r) => r.sourceId)).toEqual(["clean", "baity"]);
  });

  it("breaks ties by volume", () => {
    const small = row({ source_id: "small", n_green: MIN_SAMPLE, n_total: MIN_SAMPLE });
    const big = row({ source_id: "big", n_green: MIN_SAMPLE * 2, n_total: MIN_SAMPLE * 2 });
    const ranked = rankSources([small, big]);
    expect(ranked[0].sourceId).toBe("big");
  });

  it("awardWinner picks the top qualified source", () => {
    const honest = row({ source_id: "honest", n_green: MIN_SAMPLE, n_total: MIN_SAMPLE });
    const tiny = row({ source_id: "tiny", n_green: 1, n_total: 1 });
    expect(awardWinner(rankSources([tiny, honest]))?.sourceId).toBe("honest");
  });

  it("awardWinner returns null when no source qualifies", () => {
    const tiny = row({ source_id: "tiny", n_green: 1, n_total: 1 });
    expect(awardWinner(rankSources([tiny]))).toBeNull();
  });
});
