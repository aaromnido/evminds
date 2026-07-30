import { describe, expect, it } from "vitest";
import {
  channelUrl,
  ideasUrl,
  newAngleUrl,
  newPieceUrl,
  pieceBriefUrl,
  piecesUrl,
} from "./editorial-routes";

/**
 * These pin the shape of the URLs, which is the one thing `pnpm check` cannot
 * see: a link is a string, so a route that moves without its callers fails
 * silently and just takes you somewhere else.
 */
describe("editorial routes", () => {
  it("puts the piece in the path, not in a parameter", () => {
    expect(channelUrl("abc-123", "motor")).toBe("/admin/redaccion/pieza/abc-123/motor");
    expect(channelUrl("abc-123", "evminds")).toBe("/admin/redaccion/pieza/abc-123/evminds");
  });

  it("has no query parameters left on the channel screens", () => {
    // The whole point of phase 2b: `?canales=`, `?idea=` and `?fecha=` are all
    // answered by the piece's row, and a parameter that has to survive a
    // navigation is the bug this section already shipped twice.
    expect(channelUrl("abc-123", "motor")).not.toContain("?");
  });

  it("makes the brief the piece's root", () => {
    expect(pieceBriefUrl("abc-123")).toBe("/admin/redaccion/pieza/abc-123");
  });

  it("keeps the section landing and the wizard's start apart", () => {
    expect(piecesUrl()).toBe("/admin/redaccion");
    expect(newPieceUrl()).toBe("/admin/redaccion/nueva");
  });

  it("carries the idea into the brief step when there is one", () => {
    expect(newAngleUrl()).toBe("/admin/redaccion/nueva/enfoque");
    expect(newAngleUrl(null)).toBe("/admin/redaccion/nueva/enfoque");
    expect(newAngleUrl("c1")).toBe("/admin/redaccion/nueva/enfoque?idea=c1");
  });

  it("escapes an id that would otherwise break the URL", () => {
    expect(newAngleUrl("a b&c")).toBe("/admin/redaccion/nueva/enfoque?idea=a%20b%26c");
  });

  it("points Ideas inside Redacción", () => {
    expect(ideasUrl()).toBe("/admin/redaccion/ideas");
  });
});
