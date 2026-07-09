import { describe, it, expect } from "vitest";
import { hasSupabaseAuthCookie, isAdminRequest } from "./admin-session";

/** Minimal AstroCookies stand-in — the helper never reads/writes cookies directly. */
const cookies = {} as Parameters<typeof isAdminRequest>[0]["cookies"];

function requestWithCookie(cookieHeader: string | null): Request {
  const headers = new Headers();
  if (cookieHeader !== null) headers.set("Cookie", cookieHeader);
  return new Request("https://evminds.es/noticia/some-slug", { headers });
}

/** Fake Supabase client shaped like the calls admin-session.ts makes, for injection. */
function fakeSupabaseClient({ user, role }: { user: { id: string } | null; role?: string }) {
  return {
    auth: {
      async getUser() {
        return { data: { user } };
      },
    },
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return { data: user ? { role } : null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as ReturnType<typeof import("./supabase-server").createSupabaseServerClient>;
}

describe("hasSupabaseAuthCookie", () => {
  it("returns false for a null header", () => {
    expect(hasSupabaseAuthCookie(null)).toBe(false);
  });

  it("returns false when no auth-token cookie is present", () => {
    expect(hasSupabaseAuthCookie("other=1; another=2")).toBe(false);
  });

  it("returns true for a plain sb-<ref>-auth-token cookie", () => {
    expect(hasSupabaseAuthCookie("sb-abcdefgh-auth-token=xyz")).toBe(true);
  });

  it("returns true for a chunked sb-<ref>-auth-token.0 cookie among others", () => {
    expect(hasSupabaseAuthCookie("foo=bar; sb-abcdefgh-auth-token.0=xyz; baz=qux")).toBe(true);
  });
});

describe("isAdminRequest", () => {
  it("returns false without calling Supabase when no auth cookie is present", async () => {
    let called = false;
    const createClient = () => {
      called = true;
      return fakeSupabaseClient({ user: { id: "u1" }, role: "admin" });
    };

    const result = await isAdminRequest(
      { request: requestWithCookie(null), cookies },
      createClient,
    );

    expect(result).toBe(false);
    expect(called).toBe(false);
  });

  it("returns true when the cookie is present and the user has the admin role", async () => {
    const createClient = () => fakeSupabaseClient({ user: { id: "u1" }, role: "admin" });

    const result = await isAdminRequest(
      { request: requestWithCookie("sb-abcdefgh-auth-token=xyz"), cookies },
      createClient,
    );

    expect(result).toBe(true);
  });

  it("returns false when the cookie is present but the user role is not admin", async () => {
    const createClient = () => fakeSupabaseClient({ user: { id: "u1" }, role: "reader" });

    const result = await isAdminRequest(
      { request: requestWithCookie("sb-abcdefgh-auth-token=xyz"), cookies },
      createClient,
    );

    expect(result).toBe(false);
  });

  it("returns false when the cookie is present but getUser() returns no user", async () => {
    const createClient = () => fakeSupabaseClient({ user: null });

    const result = await isAdminRequest(
      { request: requestWithCookie("sb-abcdefgh-auth-token=xyz"), cookies },
      createClient,
    );

    expect(result).toBe(false);
  });
});
