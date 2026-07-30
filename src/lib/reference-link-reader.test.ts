import { afterEach, describe, expect, it, vi } from "vitest";
import { readReferenceLink } from "./reference-link-reader";

function htmlResponse(html: string, contentType = "text/html; charset=utf-8") {
  return {
    ok: true,
    headers: { get: (name: string) => (name === "content-type" ? contentType : null) },
    text: async () => html,
  };
}

describe("readReferenceLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a non-http(s) URL without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await readReferenceLink("javascript:alert(1)");

    expect(result).toEqual({ ok: false, error: "Enlace no válido." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("extracts the title and strips script/style/nav noise from readable HTML", async () => {
    const paragraph = "Este es el cuerpo real del artículo, ".repeat(10);
    const html = `<html><head><title>Un titular &amp; algo más</title>
      <script>evil()</script><style>.x{color:red}</style></head>
      <body><nav>Menú</nav><header>Cabecera</header>
      <article><p>${paragraph}</p></article>
      <footer>Pie</footer></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));

    const result = await readReferenceLink("https://example.com/article");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("Un titular & algo más");
    expect(result.content).toContain("cuerpo real del artículo");
    expect(result.content).not.toContain("evil()");
    expect(result.content).not.toContain("Menú");
    expect(result.content).not.toContain("Cabecera");
    expect(result.content).not.toContain("Pie");
  });

  it("fails when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, headers: { get: () => null }, text: async () => "" }),
    );

    const result = await readReferenceLink("https://example.com/404");

    expect(result.ok).toBe(false);
  });

  it("fails when the content-type isn't HTML", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("{}", "application/json")));

    const result = await readReferenceLink("https://example.com/data.json");

    expect(result.ok).toBe(false);
  });

  it("fails when the extracted text is too short (paywall/JS-only page)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("<html><body><p>Suscríbete</p></body></html>")),
    );

    const result = await readReferenceLink("https://example.com/paywalled");

    expect(result.ok).toBe(false);
  });

  it("fails when fetch throws (network error, timeout, ...)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await readReferenceLink("https://example.com/unreachable");

    expect(result.ok).toBe(false);
  });
});
