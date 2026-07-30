import { describe, expect, it } from "vitest";
import { buildPieceSummary, isStalePiece, PIECE_STALE_DAYS } from "./editorial-pieces";

const NOW = "2026-07-26T10:00:00.000Z";

function piece(overrides: Partial<Parameters<typeof buildPieceSummary>[0]> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    brief_title: "El titular del brief",
    status: "in_progress",
    updated_at: NOW,
    channels: ["motor", "evminds"],
    ...overrides,
  };
}

function draft(overrides: Partial<Parameters<typeof buildPieceSummary>[1][number]> = {}) {
  return {
    piece_id: "11111111-1111-4111-8111-111111111111",
    channel: "motor",
    status: "draft",
    publish_date: "2026-08-01",
    title: "El titular ya reescrito",
    ...overrides,
  };
}

describe("buildPieceSummary", () => {
  it("lists every chosen channel, even the ones with no row yet", () => {
    const summary = buildPieceSummary(piece(), [draft()]);

    expect(summary.channels.map((c) => c.channel)).toEqual(["motor", "evminds"]);
    expect(summary.channels[0].status).toBe("draft");
    // Chosen in step ② and never written: the list must show it as pending
    // rather than pretending the piece only has one channel.
    expect(summary.channels[1].status).toBeNull();
    expect(summary.channels[1].publishDate).toBeNull();
  });

  it("prefers the written headline over the brief title", () => {
    expect(buildPieceSummary(piece(), [draft()]).title).toBe("El titular ya reescrito");
  });

  it("falls back to the brief title when nothing is written yet", () => {
    expect(buildPieceSummary(piece(), []).title).toBe("El titular del brief");
  });

  it("ignores drafts belonging to another piece", () => {
    const summary = buildPieceSummary(piece(), [draft({ piece_id: "otra-pieza" })]);

    expect(summary.channels[0].status).toBeNull();
    expect(summary.title).toBe("El titular del brief");
  });

  it("keeps the canonical channel order whatever the stored array says", () => {
    const summary = buildPieceSummary(piece({ channels: ["evminds", "motor"] }), []);

    expect(summary.channels.map((c) => c.channel)).toEqual(["motor", "evminds"]);
  });

  it("drops channel values it does not recognize", () => {
    const summary = buildPieceSummary(piece({ channels: ["motor", "linkedin"] }), []);

    expect(summary.channels.map((c) => c.channel)).toEqual(["motor"]);
  });

  describe("where it resumes", () => {
    // The URL shape changed in phase 2b: the piece and the channel are the path,
    // and there is nothing else to carry.
    const PIECE = "11111111-1111-4111-8111-111111111111";

    it("goes to the first channel still open", () => {
      const summary = buildPieceSummary(piece(), [draft({ status: "done" })]);

      expect(summary.href).toBe(`/admin/redaccion/pieza/${PIECE}/evminds`);
    });

    it("goes to the last channel when everything is closed", () => {
      const summary = buildPieceSummary(piece({ status: "done" }), [
        draft({ status: "done" }),
        draft({ channel: "evminds", status: "scheduled" }),
      ]);

      // Not a dead end: a finished piece stays editable and reschedulable, which
      // is the requirement that made durable drafts necessary in the first place.
      expect(summary.href).toBe(`/admin/redaccion/pieza/${PIECE}/evminds`);
    });

    it("treats a channel with no row as the place to go", () => {
      const summary = buildPieceSummary(piece(), []);

      expect(summary.href).toBe(`/admin/redaccion/pieza/${PIECE}/motor`);
    });
  });
});

describe("isStalePiece", () => {
  it("is false for something touched today", () => {
    expect(isStalePiece(NOW, NOW)).toBe(false);
  });

  it("is false just inside the window", () => {
    const justInside = new Date(
      new Date(NOW).getTime() - (PIECE_STALE_DAYS - 1) * 24 * 60 * 60 * 1000,
    ).toISOString();

    expect(isStalePiece(justInside, NOW)).toBe(false);
  });

  it("is true past the window", () => {
    const older = new Date(
      new Date(NOW).getTime() - (PIECE_STALE_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString();

    expect(isStalePiece(older, NOW)).toBe(true);
  });
});
