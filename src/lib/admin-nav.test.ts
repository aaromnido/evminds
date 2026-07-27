import { describe, expect, it } from "vitest";
import { isChildActive, isParentActive, NAV_ITEMS, type NavChild } from "./admin-nav";

const redaccion = NAV_ITEMS.find((item) => item.title === "Redacción")!;
const children = redaccion.children!;
const child = (title: string): NavChild => children.find((c) => c.title === title)!;

/** Which child, if any, lights up for a given path. */
function litChild(path: string): string | null {
  return children.find((c) => isChildActive(path, c))?.title ?? null;
}

describe("isParentActive", () => {
  it("lights Dashboard only on itself", () => {
    // A prefix match here would light it on every screen in the panel.
    expect(isParentActive("/admin", "/admin")).toBe(true);
    expect(isParentActive("/admin/noticias", "/admin")).toBe(false);
  });

  it("lights a section from anything inside it", () => {
    expect(isParentActive("/admin/redaccion", redaccion.href)).toBe(true);
    expect(isParentActive("/admin/redaccion/nueva/enfoque", redaccion.href)).toBe(true);
    expect(isParentActive("/admin/redaccion/pieza/abc/motor", redaccion.href)).toBe(true);
  });

  it("does not light a section from a path that merely starts like it", () => {
    expect(isParentActive("/admin/redaccion-vieja", redaccion.href)).toBe(false);
  });
});

describe("which child is lit, screen by screen", () => {
  /**
   * Every route the section has. This list is the point of the test: the
   * highlight broke twice in one afternoon, both times because a screen was not
   * enumerated — and a wrong highlight never errors, it just says the wrong
   * place.
   */
  const ROUTES: [path: string, expected: string | null][] = [
    ["/admin/redaccion", "Tus piezas"],
    ["/admin/redaccion/nueva", "Escribir"],
    ["/admin/redaccion/nueva/enfoque", "Escribir"],
    ["/admin/redaccion/pieza/abc-123", "Escribir"],
    ["/admin/redaccion/pieza/abc-123/motor", "Escribir"],
    ["/admin/redaccion/pieza/abc-123/evminds", "Escribir"],
    ["/admin/redaccion/ideas", "Ideas"],
  ];

  for (const [path, expected] of ROUTES) {
    it(`${path} → ${expected}`, () => {
      expect(litChild(path)).toBe(expected);
    });
  }

  it("never leaves the menu mute inside the section", () => {
    for (const [path] of ROUTES) {
      expect(litChild(path)).not.toBeNull();
    }
  });

  it("never lights two children at once", () => {
    for (const [path] of ROUTES) {
      expect(children.filter((c) => isChildActive(path, c))).toHaveLength(1);
    }
  });

  it("does not light 'Tus piezas' from the screens under it", () => {
    // It is `/admin/redaccion`, so a prefix match would light it everywhere.
    expect(isChildActive("/admin/redaccion/nueva", child("Tus piezas"))).toBe(false);
    expect(isChildActive("/admin/redaccion/pieza/abc/motor", child("Tus piezas"))).toBe(false);
  });
});
