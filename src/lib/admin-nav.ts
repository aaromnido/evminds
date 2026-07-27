/**
 * The admin sidebar's entries, and which one reads as "you are here".
 *
 * **Out of the component on purpose** (2026-07-27): this is data plus two pure
 * predicates, and it broke twice in one afternoon — first no child lit on the
 * channel screens, then none on the brief. Both were silent: a wrong highlight
 * does not error, it just tells you the wrong place. In here it can be tested,
 * and the test enumerates every route the section has.
 */

import { LayoutDashboard, FilePenLine, Newspaper, PenLine } from "lucide-react";
import { ideasUrl, newPieceUrl, piecesUrl, REDACCION_BASE } from "./editorial-routes";

export interface NavChild {
  title: string;
  href: string;
  ready: boolean;
  /**
   * Extra path prefixes that also mean "you are here".
   *
   * Needed because a screen is not always reachable only from under its own
   * entry: the wizard starts at `/nueva` and continues on `/pieza/<id>/…`.
   */
  matches?: string[];
}

export interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  ready: boolean;
  /** Sub-entries, for a section that is more than one screen. */
  children?: NavChild[];
}

/**
 * Editorial (task A3, phase 2b — agreed with Fer 2026-07-27).
 *
 * **Redacción had become two things at once**: a linear wizard and a section with
 * contents of its own. Its entry pointed at step ①, which is a wizard step
 * disguised as a section landing — visible the moment the section got real
 * content, in phase 2. So it grows children, and "Ideas" moves in as one of them:
 * it only ever feeds Redacción, and it had been sitting at top level in
 * "próximamente" for weeks holding a slot for a screen that does not exist.
 *
 * See `.claude/plans/plan-ai-editorial-agent-mvp.md` → Phase 2b for the route map.
 */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, ready: true },
  {
    title: "Artículos propios",
    href: "/admin/posts",
    icon: FilePenLine,
    ready: true,
  },
  { title: "Noticias", href: "/admin/noticias", icon: Newspaper, ready: true },
  {
    title: "Redacción",
    href: piecesUrl(),
    icon: PenLine,
    ready: true,
    children: [
      { title: "Tus piezas", href: piecesUrl(), ready: true },
      { title: "Ideas", href: ideasUrl(), ready: false },
      // **The whole wizard**, not only its entry: everything under `/nueva`
      // (step ① and the brief) and every `/pieza/<id>/…` screen (steps ③/④ and
      // the brief of an existing piece). Two prefixes rather than a list of
      // screens, so this does not go stale the next time the flow gains one.
      //
      // A piece opened from the list lights "Escribir" too, and that is the right
      // trade: while you are writing, the true answer to "where am I" is that you
      // are writing.
      {
        title: "Escribir",
        href: newPieceUrl(),
        ready: true,
        matches: [newPieceUrl(), `${REDACCION_BASE}/pieza`],
      },
    ],
  },
];

/** Whether `activePath` is `href` or lives under it. */
function isUnder(activePath: string, href: string): boolean {
  return activePath === href || activePath.startsWith(`${href}/`);
}

/**
 * Whether a top-level entry should read as "you are here": anything inside it,
 * except Dashboard, which is only itself or it would light on every screen.
 */
export function isParentActive(activePath: string, href: string): boolean {
  return href === "/admin" ? activePath === href : isUnder(activePath, href);
}

/**
 * Whether a child should. **Its own screen exactly, plus whatever it declares.**
 *
 * Exact by default because a prefix match here would light "Tus piezas" — which
 * is `/admin/redaccion` — from every single route in the section. `matches` is
 * for the case that default gets wrong: a flow that continues on paths outside
 * its own entry.
 */
export function isChildActive(activePath: string, child: NavChild): boolean {
  if (activePath === child.href) return true;
  return (child.matches ?? []).some((prefix) => isUnder(activePath, prefix));
}
